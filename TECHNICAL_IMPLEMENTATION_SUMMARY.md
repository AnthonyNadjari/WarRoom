# WarRoom — Technical Implementation Summary

Structured, audit-oriented summary of what is implemented and how it is wired. No UI styling; no Prisma/NextAuth primer.

---

## 1. Full Prisma schema (models, enums, relations, cascade rules)

### Datasource & generator
- **Provider:** `postgresql` (connection via `lib/prisma.ts` / `prisma.config.ts`).
- **Generator:** `prisma-client-js`.

### NextAuth models
- **Account** — `userId` → User, `onDelete: Cascade`. Unique `[provider, providerAccountId]`. Table `accounts`.
- **Session** — `userId` → User, `onDelete: Cascade`. Unique `session_token`. Table `sessions`.
- **User** — id (cuid), email unique, `password_hash`, timestamps. Relations: accounts, sessions, companies, contacts, interactions, processes. Table `users`.
- **VerificationToken** — identifier, token, expires. Unique on token and on `[identifier, token]`. Table `verification_tokens`.

### Enums (Prisma name → DB display where `@map`)

| Enum | Values (Prisma) | Map (if any) |
|------|-----------------|--------------|
| CompanyType | Bank, HedgeFund, AssetManager, PrivateEquity, PropShop, Recruiter, Other | HedgeFund→"Hedge Fund", etc. |
| ContactCategory | Sales, Trading, Structuring, Investment, HR, Recruiter, Other | — |
| Seniority | Analyst, Associate, VP, Director, MD, Partner, HR, Recruiter, Other | — |
| InteractionGlobalCategory | Sales, Trading, Structuring, Investment, Other | — |
| InteractionType | OfficialApplication, LinkedInMessage, ColdEmail, Call, Referral | e.g. OfficialApplication→"Official Application" |
| InteractionStatus | Sent, Waiting, FollowUp, Interview, Offer, Rejected, Closed | FollowUp→"Follow-up" |
| Priority | Low, Medium, High | — |
| Outcome | None, Rejected, Interview, Offer | — |
| InteractionSourceType | Direct, ViaRecruiter | ViaRecruiter→"Via Recruiter" |
| ProcessStatus | Active, Interviewing, Offer, Rejected, Closed | — |

### Business models

**Company**
- Fields: id (uuid), userId, name, type (CompanyType), mainLocation, websiteDomain, logoUrl, notes, createdAt (no updatedAt).
- Relations: user (User, `onDelete: Cascade`), contacts, interactions, recruiterInteractions (Interaction[] as recruiter), processes.
- Indexes: userId, name.
- Table: `companies`.

**Contact**
- Fields: id (uuid), userId, companyId, firstName, lastName, exactTitle, category, seniority, location, email (unique), phone, linkedinUrl, managerId, notes, createdAt.
- Relations: user (User, `onDelete: Cascade`), company (Company, `onDelete: Cascade`), manager (Contact self, `onDelete: SetNull`), reports (Contact[]), interactions.
- Indexes: userId, companyId, managerId, email.
- Table: `contacts`.

**Interaction**
- Fields: id (uuid), userId, companyId, contactId, roleTitle, globalCategory, type, status (default Sent), priority, dateSent, lastUpdate, nextFollowUpDate, outcome, comment, sourceType (default Direct), recruiterId, processId, **parentInteractionId**, createdAt, **updatedAt**.
- Relations:
  - user (User, `onDelete: Cascade`)
  - company (Company, `onDelete: Cascade`)
  - contact (Contact, `onDelete: Cascade`)
  - recruiter (Company?, `recruiterId` — no onDelete in schema; migration uses SET NULL)
  - process (Process?, `onDelete: Cascade`)
  - **parentInteraction** (Interaction?, `parentInteractionId`, `onDelete: SetNull`)
  - **childInteractions** (Interaction[], relation "InteractionParent")
- Indexes: userId, companyId, contactId, status, dateSent(sort: Desc), nextFollowUpDate, recruiterId, processId, **parentInteractionId**.
- Table: `interactions`.

**Process**
- Fields: id (cuid), userId, companyId, roleTitle, location, status (ProcessStatus, default Active), sourceProcessId, createdAt, updatedAt.
- Relations: user (User, `onDelete: Cascade`), company (Company, `onDelete: Cascade`), sourceProcess (Process self, `onDelete: SetNull`), childProcesses (Process[]), interactions.
- Indexes: userId, companyId, sourceProcessId.
- Table: `processes`.

### Cascade summary
- User delete → Account, Session, Company, Contact, Interaction, Process (all Cascade).
- Company delete → Contact, Interaction, Process (Cascade). Recruiter-side: interactions.recruiterId set to null (DB SET NULL).
- Contact delete → Interaction (Cascade). Manager-side: contacts.managerId SetNull.
- Process delete → Interactions that reference it are **deleted** (Interaction.process `onDelete: Cascade`). Child processes: sourceProcessId set to null (SetNull). Application `deleteProcess` also explicitly unlinks children before delete.
- Interaction parent delete → child interactions: parentInteractionId set to null (`onDelete: SetNull`).

---

## 2. New or modified models (especially Process)

- **Process** — Full model. Represents an application process at a company (roleTitle, location, status). Self-relation via sourceProcessId (“Introduced via”). Interactions link via processId. Created in migration `20260219100000_add_process_model`.
- **Interaction** — Added: processId (FK to Process, Cascade), **parentInteractionId** (self-FK, SetNull), **updatedAt** (timestamp). Parent/child allows “Related to” / follow-up chains (e.g. recruiter → bank). Migration `20260219200000_parent_interaction_updated_at`.
- **Company** — Added earlier: websiteDomain, logoUrl (used for list, dashboard, company detail, recruiter context). No change in latest refactor.
- **Contact** — Unchanged in schema; exactTitle used for role-title autofill in interaction forms.

---

## 3. Server actions (by file, function + purpose)

### `app/actions/companies.ts`
- **getCompanies()** — List companies for current user (id, name, type, mainLocation, websiteDomain, **logoUrl**); ordered by name; types mapped to API.
- **getCompanyById(id)** — Single company by id, user-scoped; returns API-shaped object including **logo_url** or null.
- **createCompany(data)** — Creates company; normalizes logo_url (trim, empty→null); revalidatePath("/companies"), revalidatePath("/").
- **updateCompany(id, data)** — updateMany by id + userId; normalizes logo_url; revalidatePath("/companies"), revalidatePath("/companies/[id]"), revalidatePath("/").
- **deleteCompany(id)** — deleteMany by id + userId; revalidatePath("/companies").

### `app/actions/contacts.ts`
- **getContactsWithCompany()** — List contacts with company { id, name }; ordered by createdAt desc.
- **createContact(data)** — Create contact; revalidatePath("/contacts"), revalidatePath("/companies/[id]").
- **updateContact(id, data)** — updateMany by id + userId; revalidatePath("/contacts").
- No **deleteContact**; contacts removed only via company delete (cascade).

### `app/actions/interactions.ts`
- **getInteractionsWithRelations()** — All interactions with company (id, name, websiteDomain, logoUrl), contact, recruiter, process, **parentInteraction** (id, roleTitle, type, dateSent, company.name); order by dateSent desc; mapped to API types; includes **updated_at**.
- **getInteractionsForDashboard()** — Same query and mapping as getInteractionsWithRelations; used by dashboard page only.
- **getInteractionsForCompany(companyId)** — Light list for “Attach existing” modal: id, role_title, type, date_sent, process_id, contact (first_name, last_name); user-scoped, company-scoped; order by dateSent desc.
- **getInteractionsForParentSelect()** — All user interactions for “Related to” dropdown: id, role_title, type, date_sent, company.name; order by dateSent desc (global, not per-company).
- **getCompaniesForSelect()** — id, name for company dropdowns.
- **getRecruitersForSelect()** — Companies with type Recruiter (id, name).
- **getRecruiterStats(recruiterId)** — Per-recruiter aggregates: total, interviews, offers, rejections, active, conversionRate (interviews/total %). Used on company detail performance tab.
- **updateInteraction(id, data)** — Validates: Via Recruiter ⇒ recruiter_id required; recruiter must be user’s company type Recruiter; **parent_interaction_id**: not self, parent exists and belongs to user, no circular ref (parent.parentInteractionId !== id). updateMany by id + userId; accepts **process_id**, **parent_interaction_id**. revalidatePath("/interactions"), revalidatePath("/"), and if data.process_id set then revalidatePath("/processes/[id]").
- **createInteraction(data)** — Same recruiter and **parent_interaction_id** validation (parent exists, same user; no cycle check needed on create). Creates interaction with optional process_id, parent_interaction_id; revalidatePath("/interactions"), revalidatePath("/"), and if process_id set then revalidatePath("/processes/[id]"). Returns new id.
- **getContactsForCompany(companyId)** — Contacts for company (id, firstName, lastName, exactTitle) for dropdowns and role-title autofill.

### `app/actions/processes.ts`
- **getProcesses()** — All processes with company (id, name, websiteDomain, logoUrl), sourceProcess (id, role_title, company), _count.interactions; order updatedAt desc; status mapped to API.
- **getProcessById(id)** — Single process with same includes; null if not found.
- **getProcessesForCompany(companyId)** — Processes for one company (same shape); used by InteractionForm “Attach to Process” and company detail.
- **getProcessesForDashboard()** — Same as getProcesses(); **not** currently used by dashboard page (dashboard uses only interactions).
- **getProcessesForSelect()** — Light list for dropdowns: id, role_title, status, company { id, name }; used by New Process “Introduced via” and processes list.
- **createProcess(data)** — Validates company and optional source_process_id belong to user; status default Active; **source_process_id** passed as null when empty string; revalidatePath("/processes"), revalidatePath("/"), revalidatePath("/companies/[id]"). Returns new id.
- **updateProcess(id, data)** — Validates source_process_id if present (no self-reference); updateMany by id + userId; revalidatePath("/processes"), revalidatePath("/processes/[id]"), revalidatePath("/").
- **deleteProcess(id)** — Unlinks child processes (set sourceProcessId to null), then deleteMany process by id + userId; revalidatePath("/processes"), revalidatePath("/"). Interactions linked to process are deleted by DB cascade.

### `app/actions/settings.ts`
- **getInteractionsForExport()** — All interactions with company.name, contact (firstName, lastName, email), recruiter.name; order dateSent desc; for CSV export (process and parent interaction not in export payload).

### `app/actions/search.ts`
- **searchAll(query)** — User-scoped: companies (name contains, take 5), contacts (firstName/lastName/email/exactTitle, take 10), interactions (roleTitle contains, take 5). Returns SearchHit[] with type, id, href, title, subtitle. **Processes not included in global search.**

---

## 4. Route structure (new routes, modified pages)

### Public
- **/login** — Login page.
- **/api/auth/[...nextauth]** — NextAuth API route.

### Protected (auth-required; layout group `(protected)`)
- **/** — Dashboard. Server fetches **only** `getInteractionsForDashboard()`. Renders `DashboardClient` with initialInteractions. No process fetch; no stat cards; sections: Scheduled, This Week, Recruiter Overview, Overdue follow-ups, Upcoming follow-ups.
- **/companies** — List companies (server passes data; logo_url in select).
- **/companies/new** — New company form (logo_url persisted and revalidated).
- **/companies/[id]** — Company detail; tabs: interactions, people, processes, performance (performance only for type Recruiter). Server: company (incl. logo_url), contacts, interactions, **getProcessesForCompany(id)**; defaultTab from query `tab`.
- **/companies/[id]/edit** — Edit company (logo_url included).
- **/companies/[id]/contacts/new** — New contact (LinkedIn URL plain field + helper text; no autofill).
- **/contacts** — List contacts with company.
- **/interactions** — Interaction list + filters; refetch via getInteractionsWithRelations(); New Interaction dialog (company → contacts, role title autofill from contact.exactTitle when empty, no overwrite after manual edit); row click opens Sheet with InteractionForm (Attach to Process, Related to, last updated, “Mark process as Interviewing?” when status Interview and process Active). List and Sheet show parent “Follow-up to” and last updated; highlight via ?highlight=id.
- **/processes** — Process list; New Process dialog (company, role, location, **Introduced via** from getProcessesForSelect(), source_process_id saved as null when "None"). Query: `?new=true`, `?company=id`.
- **/processes/[id]** — Process detail: process (with company logo), interactions linked to process, child processes, “Introduced via” link. Buttons: **Attach existing** (modal: getInteractionsForCompany(companyId), filter process_id !== current process, updateInteraction(id, { process_id })), **Add** (new interaction with process_id). Server: process, interactions (with contact, company, recruiter), childProcesses, companies, contacts, getProcessesForSelect (for allProcesses).
- **/settings** — Export CSV (interactions), sign out.

### Layouts / errors
- Root layout: app layout.
- `(protected)/layout.tsx`: sidebar + header + mobile nav.
- `(protected)/error.tsx`: protected error boundary.
- Root `error.tsx`, `not-found.tsx`: global error and 404.

---

## 5. Dashboard logic (queries and derived data)

- **Single data source (server):**  
  - `getInteractionsForDashboard()` — All interactions with company (incl. logo_url), contact, recruiter, process, parentInteraction; order by dateSent desc. **No process-specific query.**

- **Client-side derivation (dashboard-client.tsx):**  
  - **startOfToday()** / **endOfWeek()** — Local date strings (YYYY-MM-DD) for filtering.
  - **Scheduled** — Interactions where (type === "Call" OR status === "Interview") AND date_sent >= startOfToday(); sorted ASC by date_sent; empty message: “No upcoming calls or interviews.”
  - **This Week** — Interactions where date_sent in [today, endOfWeek()]; any type; sorted ASC.
  - **Overdue follow-ups** — Red severity from getFollowUpSeverity (next_follow_up_date ≤ today, or Waiting + days since date_sent ≥ 28).
  - **Upcoming follow-ups** — Orange severity (Waiting, 14 ≤ days since date_sent < 28).
  - **Recruiter Overview** — From interactions with source_type "Via Recruiter"; aggregate per recruiter (mandates, interviews, offers); top 5 by interviews then mandates; links to `/companies/[id]?tab=performance`.

- **Follow-up severity (`lib/follow-up.ts`):**  
  - next_follow_up_date set and ≤ today → red.  
  - Else status !== "Waiting" or no date_sent → normal.  
  - Else by days since date_sent: 0–13 normal, 14–27 orange, 28+ red.

- **Date display:** All user-facing dates use `formatDate()` from `lib/utils.ts` (DD/MM/YYYY, UTC).

---

## 6. Schema migrations performed

1. **20260218074000_init**  
   - NextAuth tables (accounts, sessions, users, verification_tokens).  
   - CompanyType (Bank, Hedge Fund, Asset Manager, Recruiter Firm, Other), ContactCategory, Seniority, InteractionGlobalCategory, InteractionType, InteractionStatus, Priority, Outcome.  
   - companies (id, user_id, name, type, main_location, notes, created_at).  
   - contacts, interactions with FKs; Contact.manager_id SET NULL; user/company/contact cascades.

2. **20260218140000_add_recruiter_tracking_logos**  
   - InteractionSourceType enum (Direct, Via Recruiter).  
   - CompanyType: ADD VALUE Private Equity, Prop Shop, Recruiter.  
   - companies: website_domain, logo_url.  
   - interactions: source_type (default Direct), recruiter_id + FK to companies ON DELETE SET NULL; indexes next_follow_up_date, recruiter_id.  
   - Data: UPDATE companies SET type = 'Recruiter' WHERE type = 'Recruiter Firm'.

3. **20260219100000_add_process_model**  
   - ProcessStatus enum.  
   - processes table (id, user_id, company_id, role_title, location, status, source_process_id, created_at, updated_at); FKs to users (Cascade), companies (Cascade), processes (SetNull for source_process_id).  
   - interactions.process_id + FK to processes ON DELETE CASCADE; index on process_id.

4. **20260219200000_parent_interaction_updated_at**  
   - interactions: ADD COLUMN parent_interaction_id TEXT; ADD COLUMN updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP.  
   - CREATE INDEX interactions_parent_interaction_id_idx.  
   - ADD CONSTRAINT interactions_parent_interaction_id_fkey FOREIGN KEY (parent_interaction_id) REFERENCES interactions(id) ON DELETE SET NULL ON UPDATE CASCADE.

---

## 7. Breaking changes introduced

- **CompanyType:** “Recruiter Firm” → “Recruiter”. Migration updates existing rows; enum value “Recruiter Firm” may still exist in PostgreSQL. App uses only “Recruiter”.
- **Interaction:** New optional fields (source_type default Direct, recruiterId, processId, **parentInteractionId**, **updatedAt**). Existing rows get default source_type, null for optional FKs and updated_at default — no row breakage.
- **Process:** New entity; no change to existing Company/Contact/Interaction beyond optional processId and later parentInteractionId/updatedAt.

---

## 8. Temporary shortcuts / TODOs left in code

- No explicit TODO/FIXME/HACK/XXX comments found in `.ts`/`.tsx`.
- **Process delete:** Child processes explicitly unlinked (sourceProcessId = null) in app before delete; redundant with DB SetNull but keeps revalidation and intent clear.
- **Dashboard:** Single heavy query (getInteractionsForDashboard = getInteractionsWithRelations); no dedicated lightweight dashboard query or limit; filtering and sections done client-side.
- **New Process “Introduced via”:** Select uses empty string for “None”; submit passes `source_process_id: sourceProcessId.trim() || null` so null is persisted correctly.
- **Contact form:** LinkedIn URL is plain text only; helper text: “LinkedIn autofill unavailable — please enter details manually.” No parseLinkedInProfile or scraping.

---

## 9. Data integrity risks and known limitations

- **Recruiter FK:** Interaction.recruiterId → Company. If recruiter company is deleted, DB sets recruiterId to null. “Via Recruiter” interactions can then show with no recruiter name unless UI handles null.
- **Process delete cascade:** Deleting a process **deletes** all interactions that reference it (onDelete: Cascade). No soft delete or reassignment.
- **Parent interaction:** Self-reference and cycle prevented in updateInteraction (and createInteraction only checks parent exists). If parent is deleted, parentInteractionId set to null (SetNull).
- **Contact delete:** No dedicated delete contact action; only via company delete (cascade).
- **Company logos:** createCompany/updateCompany normalize logo_url (trim, empty→null); revalidatePath includes "/" and "/companies" so list and dashboard get fresh data; logo_url in getCompanies, getCompanyById, and interaction includes (company.logoUrl) for list, dashboard, company detail, and recruiter context.
- **Export CSV:** Does not include process_id, process role_title, parent_interaction_id, or updated_at.
- **Global search:** Processes are not searchable; only companies, contacts, interactions.
- **Single-user:** All queries filter by getCurrentUserId(); no row-level security; tenant isolation is application-level only.
- **Date handling:** formatDate uses UTC (getUTCDate, getUTCMonth, getUTCFullYear) for consistent DD/MM/YYYY; input[type=date] and server still use ISO date strings (YYYY-MM-DD) for storage and form values.

---

## File reference (key implementation files)

| Area | Files |
|------|--------|
| Schema | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/` (init, add_recruiter_tracking_logos, add_process_model, parent_interaction_updated_at) |
| Session / auth | `lib/session.ts`, `lib/auth.ts`, `middleware.ts` |
| Enum mapping | `lib/map-prisma.ts` |
| Types | `types/database.ts` (Interaction includes parent_interaction_id, updated_at; InteractionWithRelations includes parentInteraction) |
| Date | `lib/utils.ts` — formatDate(dateStr) → DD/MM/YYYY |
| Follow-up | `lib/follow-up.ts` — getFollowUpSeverity(interaction) |
| Actions | `app/actions/companies.ts`, `contacts.ts`, `interactions.ts`, `processes.ts`, `settings.ts`, `search.ts` |
| Dashboard | `app/(protected)/page.tsx`, `app/(protected)/dashboard-client.tsx` |
| Company detail | `app/(protected)/companies/[id]/page.tsx`, `company-detail-client.tsx` (tabs: interactions, people, processes, performance) |
| Process list/detail | `app/(protected)/processes/page.tsx`, `processes-client.tsx`, `app/(protected)/processes/[id]/page.tsx`, `process-detail-client.tsx` (Attach existing + Add interaction) |
| Interactions | `app/(protected)/interactions/page.tsx`, `interactions-client.tsx`, `components/interaction-form.tsx` (Attach to Process, Related to, last updated, Interviewing suggestion) |
| Contact form | `components/contact-form.tsx` (LinkedIn helper text, no autofill) |

---

*End of technical implementation summary.*
