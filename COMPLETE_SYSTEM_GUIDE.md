# WarRoom — Complete System Guide

**Comprehensive documentation explaining how every component, page, tab, interaction, and data flow works together.**

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Data Model & Relationships](#data-model--relationships)
3. [Navigation & Routing Flow](#navigation--routing-flow)
4. [Page-by-Page Breakdown](#page-by-page-breakdown)
5. [Tab System & Interactions](#tab-system--interactions)
6. [Component Communication](#component-communication)
7. [State Management & Data Flow](#state-management--data-flow)
8. [User Workflows](#user-workflows)
9. [Cross-Page Linking Patterns](#cross-page-linking-patterns)
10. [Form Interactions & Cascading Dropdowns](#form-interactions--cascading-dropdowns)
11. [Search & Filtering System](#search--filtering-system)
12. [Real-time Updates & Revalidation](#real-time-updates--revalidation)
13. [Detailed Component Reference](#detailed-component-reference)
14. [Algorithms & Business Logic](#algorithms--business-logic)
15. [Server Actions Reference](#server-actions-reference)
16. [Revalidation Map](#revalidation-map)
17. [Edge Cases & Empty States](#edge-cases--empty-states)
18. [Shared Utilities & Subcomponents](#shared-utilities--subcomponents)

---

## System Architecture Overview

### Core Entities & Their Relationships

```
User (single user, authenticated)
├── Companies (many)
│   ├── Contacts (many, hierarchical via manager_id)
│   ├── Interactions (many, via company_id)
│   └── Processes (many, via company_id)
│
├── Interactions (many)
│   ├── Links to: Company, Contact, Process (optional), Recruiter Company (optional)
│   └── Has: source_type (Direct/Via Recruiter), recruiter_id (if Via Recruiter)
│
└── Processes (many)
    ├── Links to: Company, Source Process (optional, self-referential)
    ├── Has: status (Active/Interviewing/Offer/Rejected/Closed)
    └── Has: Interactions (many, via process_id)
```

### Key Design Patterns

1. **Server Components → Client Components**: Pages fetch data server-side, pass to client components for interactivity
2. **Server Actions**: All mutations go through `"use server"` actions (no API routes)
3. **Revalidation**: `revalidatePath()` after mutations to refresh Next.js cache
4. **Cascading Dropdowns**: Company → Contacts, Source Type → Recruiter
5. **Tab-based Navigation**: Company detail uses tabs; URL query params control default tab
6. **Sheet/Dialog Modals**: Inline editing via Sheet (interactions), Dialog (create forms)
7. **Auto-save with Debounce**: InteractionForm saves after 500ms of inactivity
8. **Highlight System**: URL query params (`?highlight=id`) highlight specific items

---

## Data Model & Relationships

### Company
- **Purpose**: Represents a target company (bank, hedge fund, recruiter, etc.)
- **Key Fields**: name, type (enum), main_location, website_domain, logo_url, notes
- **Relations**: 
  - Has many Contacts (CASCADE delete)
  - Has many Interactions (CASCADE delete)
  - Has many Processes (CASCADE delete)
  - Can be a Recruiter (if type="Recruiter") → referenced by Interactions.recruiter_id

### Contact
- **Purpose**: Person at a company
- **Key Fields**: firstName, lastName, exactTitle, category, seniority, email (unique), manager_id
- **Relations**:
  - Belongs to Company (CASCADE delete)
  - Self-referential: manager_id → Contact (SET NULL on delete)
  - Has many Interactions (CASCADE delete)
- **Hierarchy**: Contacts can have managers → builds org chart tree

### Interaction
- **Purpose**: Single touchpoint (application, email, call, etc.)
- **Key Fields**: roleTitle, type, status, priority, dateSent, nextFollowUpDate, sourceType, recruiterId, processId
- **Relations**:
  - Belongs to Company (CASCADE delete)
  - Belongs to Contact (CASCADE delete)
  - Optional: Links to Process (CASCADE delete if process deleted)
  - Optional: Links to Recruiter Company (SET NULL if recruiter deleted)
- **Source Types**: "Direct" or "Via Recruiter" (if Via Recruiter, recruiterId required)

### Process
- **Purpose**: Application pipeline at a company (role + location + status)
- **Key Fields**: roleTitle, location, status (Active/Interviewing/Offer/Rejected/Closed), sourceProcessId
- **Relations**:
  - Belongs to Company (CASCADE delete)
  - Self-referential: sourceProcessId → Process (SET NULL on delete)
  - Has many Interactions (via process_id, CASCADE delete if process deleted)
- **Source Process**: Can link to another process (e.g., recruiter-driven process derived from original)

---

## Navigation & Routing Flow

### Route Structure

```
/ (Dashboard)
├── /companies (List)
│   ├── /companies/new (Create)
│   └── /companies/[id] (Detail)
│       ├── ?tab=interactions (default)
│       ├── ?tab=processes
│       ├── ?tab=people
│       └── ?tab=performance (only if type=Recruiter)
│   └── /companies/[id]/edit (Edit)
│   └── /companies/[id]/contacts/new (Add Contact)
│
├── /contacts (List)
│
├── /interactions (List)
│   └── ?highlight=[id] (highlight specific interaction)
│
├── /processes (List)
│   ├── ?new=true (open create dialog)
│   └── ?company=[id] (preselect company in create dialog)
│   └── /processes/[id] (Detail)
│
└── /settings (Export CSV, Sign out)
```

### Navigation Patterns

1. **Breadcrumb Navigation**: Back buttons (`ArrowLeft`) return to list pages
2. **Deep Linking**: Company detail tabs use `?tab=` query param; interactions use `?highlight=`
3. **Preselection**: Process create can preselect company via `?company=id`
4. **Post-Create Redirect**: After creating, redirect to detail page (company → `/companies/[id]`, process → `/processes/[id]`)
5. **Cross-Linking**: Interactions link to companies, processes, recruiters; processes link to companies and source processes

---

## Page-by-Page Breakdown

### Dashboard (`/`)

**Server Component** (`page.tsx`):
- Fetches: `getInteractionsForDashboard()`, `getProcessesForDashboard()`
- Passes to: `DashboardClient`

**Client Component** (`dashboard-client.tsx`):
- **Stat Cards** (8 total):
  - Process pipeline: Active+Interviewing, Interviewing, Offer, Rejected
  - Interaction stats: Total, Active Interviews, Need Follow-up, Overdue
- **Sections**:
  - Overdue follow-ups (red severity)
  - Upcoming follow-ups (orange severity)
  - Active interviews (status="Interview")
  - Recently sent (first 8 interactions)
- **Recruiter Overview**: Aggregates interactions with source_type="Via Recruiter", shows top 5 recruiters by interviews
- **Links**: Stat cards link to `/processes`, `/interactions`; interaction rows link to `/interactions?highlight=[id]`; recruiter rows link to `/companies/[id]?tab=performance`

**Data Flow**:
```
Server fetch → DashboardClient → Client-side filtering/grouping → Render
```

**Dashboard stat card logic (exact)**:
- `processCounts`: Loop over initialProcesses; for each p.status increment processCounts[p.status]. Then: Active processes = (processCounts["Active"] ?? 0) + (processCounts["Interviewing"] ?? 0); Interviewing = processCounts["Interviewing"] ?? 0; Offer = processCounts["Offer"] ?? 0; Rejected = processCounts["Rejected"] ?? 0.
- `red`, `orange`, `interview`: For each i in initialInteractions, severity = getFollowUpSeverity(i); if severity === "red" push to red; else if severity === "orange" push to orange; if i.status === "Interview" push to interview. recent = initialInteractions.slice(0, 8).
- Stat card "Need follow-up" value = red.length + orange.length; "Overdue" = red.length.

---

### Companies List (`/companies`)

**Server Component** (`page.tsx`):
- Fetches: `getCompanies()`
- Passes to: `CompaniesClient`

**Client Component** (`companies-client.tsx`):
- **Filtering**:
  - Type filter tabs (All, Banks, Hedge Funds, etc.) with counts
  - Search by name (client-side)
- **Display**: Grid of company cards with logo, name, type badge, location
- **Actions**: "Add company" button → `/companies/new`
- **Links**: Each card → `/companies/[id]`

**State Management**:
- `search` (string)
- `typeFilter` (string: "all" | CompanyType)
- `filtered` (computed via useMemo)

---

### Company Detail (`/companies/[id]`)

**Server Component** (`page.tsx`):
- Fetches: Company, Contacts, Interactions, Processes (`getProcessesForCompany(id)`)
- Reads `searchParams.tab` → defaultTab
- Passes to: `CompanyDetailClient`

**Client Component** (`company-detail-client.tsx`):
- **Header**: Company logo, name, type badge, location, actions (Edit/Delete)
- **Tabs** (4 tabs):
  1. **Interactions** (`tab=interactions`):
     - Lists all interactions for this company
     - Shows contact name, role title, status, date sent
     - Color-coded by follow-up severity (red/orange borders)
     - Links to `/interactions?highlight=[id]`
  
  2. **Processes** (`tab=processes`):
     - Lists all processes for this company
     - Shows role title, location, status badge, interaction count, source process link
     - "New process" button → `/processes?new=true&company=[id]`
     - Each process links to `/processes/[id]`
  
  3. **People** (`tab=people`):
     - Hierarchical org chart of contacts
     - Built from `buildContactTree()`: roots (no manager) → children (by manager_id)
     - Sorted by seniority (Partner → MD → Director → VP → Associate → Analyst)
     - Shows last contact date (from interactions)
     - "Add contact" button → `/companies/[id]/contacts/new`
  
  4. **Performance** (`tab=performance`, only if `company.type === "Recruiter"`):
     - Shows recruiter stats: Total mandates, Interviews, Offers, Rejections, Active, Conversion rate
     - Fetched via `getRecruiterStats(companyId)` (client-side useEffect)
     - Stat cards with icons

**Tab State**:
- `tab` state initialized from `defaultTab` prop
- If `defaultTab === "performance"` but not recruiter → fallback to "interactions"
- Tab changes update URL via `onValueChange` (but URL doesn't update — tab state is local)

**Cross-Linking**:
- Interactions tab → `/interactions?highlight=[id]`
- Processes tab → `/processes/[id]`
- People tab → Contact cards show last contact date (computed from interactions)

**Company detail server fetch (exact)**:
- Company: `prisma.company.findFirst({ where: { id, userId } })`; notFound() if null.
- Contacts: `prisma.contact.findMany({ where: { companyId: id, userId }, orderBy: { createdAt: "desc" } })`.
- Interactions: `prisma.interaction.findMany({ where: { companyId: id, userId }, include: { contact: { select: { id, firstName, lastName } } }, orderBy: { dateSent: "desc" } })`.
- Processes: `getProcessesForCompany(id)` — prisma.process.findMany({ where: { userId, companyId }, include: PROCESS_INCLUDES, orderBy: { updatedAt: "desc" } }).
- defaultTab: From searchParams.tab — "people" | "processes" | "performance" | else "interactions".

---

### Interactions List (`/interactions`)

**Server Component** (`page.tsx`):
- Fetches: `getInteractionsWithRelations()`, `getCompaniesForSelect()`, `getProcessesForSelect()`
- Passes to: `InteractionsClient`

**Client Component** (`interactions-client.tsx`):
- **Header**: Title, count, "Filters" toggle, "New interaction" button
- **Filters Panel** (collapsible):
  - Status, Company, Priority, Category, Process, Date From/To
  - "Clear filters" button (X icon) when filters active
- **Display**:
  - Desktop: Table view (Company, Contact, Role, Status, Priority, Date, Follow-up badge)
  - Mobile: Card view (Company, Contact, Role, badges)
- **Highlighting**: If `?highlight=[id]` in URL, that row gets `bg-accent`
- **Row Click**: Opens Sheet with `InteractionForm` for editing
- **New Interaction Dialog**:
  - Company dropdown → cascades to Contact dropdown (loads contacts for selected company)
  - Role title autofills from contact's `exactTitle` if available
  - Source type → if "Via Recruiter", shows recruiter dropdown (loads recruiters)
  - Note: The main New Interaction dialog does **not** include a process dropdown; linking to a process is done when adding an interaction from Process detail. The interactions list has a **filter** by process (and "No process"), but create does not set process_id.
  - Creates interaction → closes dialog → resets form → calls `onCreated()` (refetch) → updates list

**State Management**:
- `interactions` (from props, updated via `refetch()`)
- `statusFilter`, `companyFilter`, `priorityFilter`, `categoryFilter`, `processFilter`, `dateFrom`, `dateTo`
- `selectedId` (for Sheet modal)
- `showNewDialog`, `showFilters`
- `filtered` (computed via useMemo)

**Filtering Logic**:
- Process filter: "none" filters for `process_id === null`
- Date filters: `date_sent >= dateFrom` and `date_sent <= dateTo`
- All filters combined with AND logic

**Cross-Linking**:
- Company name → `/companies/[id]`
- Recruiter badge → `/companies/[recruiterId]`
- Process badge → `/processes/[processId]`
- Row click → Sheet with `InteractionForm` → can edit all fields

---

### Interaction Form (`InteractionForm` component)

**Used In**: Interactions Sheet (edit), Process Detail (add to process)

**Features**:
- **Auto-save**: Debounced save after 500ms of inactivity (`DEBOUNCE_MS`)
- **Fields**: roleTitle, category, type, status, priority, dateSent, lastUpdate, nextFollowUpDate, outcome, comment, sourceType, recruiterId
- **Recruiter Loading**: If sourceType="Via Recruiter", loads recruiters via `getRecruitersForSelect()`
- **Validation**: If sourceType="Via Recruiter", recruiterId required
- **Save**: Calls `updateInteraction()` → triggers `onSaved()` callback → parent refetches

**State Management**:
- All fields in local state
- `dirty` flag tracks if any field changed
- `useEffect` watches `dirty` + all fields → debounced save
- `saving` flag prevents double-saves

---

### Processes List (`/processes`)

**Server Component** (`page.tsx`):
- Reads `searchParams.new` and `searchParams.company`
- Fetches: `getProcesses()`, `getCompaniesForSelect()`, `getProcessesForSelect()`
- Passes: `openNew`, `preselectedCompanyId` to client

**Client Component** (`processes-client.tsx`):
- **Header**: Title, "New Process" button
- **Filter Tabs**: All, Active, Interviewing, Offer, Rejected, Closed (with counts)
- **Search**: By role title, company name, location
- **Display**: List of process cards with:
  - Company logo, role title, status badge
  - Company name, location, interaction count, source process link
  - Updated date
- **New Process Dialog**:
  - Company dropdown (preselected if `preselectedCompanyId`)
  - Role title (required)
  - Location (optional)
  - Source process dropdown (optional, filters out Closed/Rejected)
  - Creates process → redirects to `/processes/[id]`

**State Management**:
- `dialogOpen` (initialized from `openNew` prop)
- `filter` (status filter)
- `search` (text search)
- `filtered` (computed via useMemo)

**Cross-Linking**:
- Process cards → `/processes/[id]`
- Source process link → `/processes/[sourceProcessId]`
- Company logo → `/companies/[companyId]`

---

### Process Detail (`/processes/[id]`)

**Server Component** (`page.tsx`):
- Fetches: Process with company, sourceProcess, childProcesses, interactions (with contact, company, recruiter), `_count.interactions`
- Also fetches: `getProcessesForSelect()`, `getCompaniesForSelect()`, `getContactsForCompany(companyId)`
- Passes to: `ProcessDetailClient`

**Client Component** (`process-detail-client.tsx`):
- **Header**:
  - Back button → `/processes`
  - Company logo, role title, company name (link), location, created date
  - Status dropdown (updates process status via `updateProcess()`)
  - Delete button (with confirmation dialog)
- **Source Process Link** (if exists):
  - Shows "Introduced via" card with link to source process
- **Linked Processes** (child processes):
  - Shows processes that have this process as `sourceProcessId`
  - List with company name, role title, status badge
  - Links to each child process
- **Interactions Timeline**:
  - Lists all interactions linked to this process (`process_id === process.id`)
  - Shows contact name, type, recruiter badge, date sent, status badge
  - Color-coded by follow-up severity
  - "Add" button → opens `AddInteractionDialog`
  - Each interaction links to `/interactions?highlight=[id]`

**Add Interaction Dialog**:
- Contact dropdown (loads contacts for process's company)
- Role title (autofills from contact's `exactTitle`)
- Type, Category dropdowns
- Creates interaction with `process_id` set → closes dialog → `router.refresh()` → updates list

**State Management**:
- `status` (local state, synced with process.status)
- `addDialogOpen` (for Add Interaction dialog)
- Status change → `updateProcess()` → `router.refresh()`

**Cross-Linking**:
- Company name → `/companies/[companyId]`
- Source process → `/processes/[sourceProcessId]`
- Child processes → `/processes/[childId]`
- Interactions → `/interactions?highlight=[id]`

---

### Contacts List (`/contacts`)

**Server Component** (`page.tsx`):
- Fetches: `getContactsWithCompany()`
- Passes to: `ContactsClient`

**Client Component** (`contacts-client.tsx`):
- **Search**: By name, email, exactTitle, company name (client-side)
- **Display**: List of contact cards with:
  - Avatar initials, name, title, email, company name
- **Links**: Each contact → `/companies/[companyId]?tab=people`

**State Management**:
- `search` (string)
- `filtered` (computed inline, no useMemo)

---

## Tab System & Interactions

### Company Detail Tabs

**Tab Switching**:
- Tabs use ShadCN `Tabs` component
- State: `tab` (local state, initialized from `defaultTab` prop)
- URL query param `?tab=` controls initial tab, but tab changes don't update URL (local state only)

**Tab Content**:

1. **Interactions Tab**:
   - Data: `interactions` prop (filtered by `companyId`)
   - Display: List of interaction links
   - Cross-link: Each interaction → `/interactions?highlight=[id]`
   - Severity coloring: Red/orange borders based on `getFollowUpSeverity()`

2. **Processes Tab**:
   - Data: `processes` prop (filtered by `companyId`)
   - Display: List of process cards
   - Action: "New process" button → `/processes?new=true&company=[id]`
   - Cross-link: Each process → `/processes/[id]`

3. **People Tab**:
   - Data: `contacts` prop (filtered by `companyId`)
   - Display: Hierarchical tree (`ContactTree` component)
   - Logic: `buildContactTree()` builds tree from manager_id relationships
   - Sorting: By seniority (Partner → Analyst)
   - Last contact date: Computed from interactions (finds latest `date_sent` or `last_update` per contact)
   - Action: "Add contact" button → `/companies/[id]/contacts/new`

4. **Performance Tab** (Recruiter only):
   - Conditional: Only shown if `company.type === "Recruiter"`
   - Data: Fetched client-side via `getRecruiterStats(companyId)`
   - Display: 6 stat cards (Total mandates, Interviews, Offers, Rejections, Active, Conversion rate)
   - Loading: Shows "Loading stats..." while fetching

**Tab State Initialization**:
```typescript
const [tab, setTab] = useState(
  defaultTab === "performance" && !isRecruiter 
    ? "interactions" 
    : defaultTab
);
```

---

## Component Communication

### Parent → Child Data Flow

1. **Server → Client**:
   - Server components fetch data → pass as props to client components
   - Example: `page.tsx` → `CompanyDetailClient` (company, contacts, interactions, processes)

2. **Client → Client**:
   - Parent client components pass data to child client components
   - Example: `InteractionsClient` → `NewInteractionDialog` (companies list)

### Child → Parent Callbacks

1. **onSaved/onCreated**:
   - Forms/components call parent callbacks after mutations
   - Example: `InteractionForm` → `onSaved()` → parent calls `refetch()`

2. **onOpenChange**:
   - Dialogs/Sheets notify parent of open/close state
   - Example: `NewInteractionDialog` → `onOpenChange(false)` → parent closes dialog

### Cross-Component Communication

1. **URL Query Params**:
   - `?tab=` → controls default tab
   - `?highlight=[id]` → highlights interaction
   - `?new=true` → opens create dialog
   - `?company=[id]` → preselects company

2. **Router Navigation**:
   - `router.push()` → navigate to new page
   - `router.refresh()` → refresh server data (after mutations)
   - `router.back()` → go back in history

---

## State Management & Data Flow

### Server-Side State (Next.js Cache)

- **Initial Load**: Server components fetch data, Next.js caches results
- **Revalidation**: `revalidatePath()` after mutations clears cache for that path
- **Refresh**: `router.refresh()` triggers server component re-fetch

### Client-Side State

1. **Local Component State**:
   - Form inputs (useState)
   - Dialog/Sheet open state
   - Filter/search state
   - Selected item state

2. **Computed State** (useMemo):
   - Filtered lists (interactions, companies, processes)
   - Aggregated counts (status counts, type counts)
   - Derived data (contact tree, recruiter stats)

3. **Debounced Auto-Save**:
   - `InteractionForm` uses `useEffect` + `setTimeout` for debounced save
   - `dirty` flag tracks if form changed
   - Save triggers after 500ms of inactivity

### Data Flow Patterns

1. **Create Flow**:
   ```
   User fills form → Submit → Server Action → revalidatePath() → router.push(detail) → Server re-fetches → Client renders
   ```

2. **Update Flow**:
   ```
   User edits → Auto-save (debounced) → Server Action → revalidatePath() → router.refresh() → Server re-fetches → Client updates
   ```

3. **Delete Flow**:
   ```
   User confirms delete → Server Action → revalidatePath() → router.push(list) → Server re-fetches → Client renders
   ```

4. **Filter Flow**:
   ```
   User changes filter → Local state updates → useMemo recomputes filtered list → Component re-renders
   ```

---

## User Workflows

### Workflow 1: Create Company → Add Contacts → Create Interactions

1. **Create Company**:
   - Navigate to `/companies/new`
   - Fill form (name, type, location, website domain, logo URL)
   - Submit → `createCompany()` → redirects to `/companies/[id]`

2. **Add Contacts**:
   - On company detail, switch to "People" tab
   - Click "Add contact" → `/companies/[id]/contacts/new`
   - Fill form (name, title, email, LinkedIn URL, manager)
   - Submit → `createContact()` → redirects to `/companies/[id]?tab=people`
   - Contact appears in org chart tree

3. **Create Interactions**:
   - Option A: From Interactions list → "New interaction" → Select company → Contact dropdown populates → Fill form → Submit
   - Option B: From Company detail → Interactions tab → Click interaction → Edit in Sheet
   - Option C: From Process detail → "Add Interaction" → Contact dropdown (pre-filled company) → Submit

### Workflow 2: Create Process → Link Interactions

1. **Create Process**:
   - Navigate to `/processes` → "New Process"
   - Select company, enter role title, location
   - Optionally select source process (if introduced via another process)
   - Submit → redirects to `/processes/[id]`

2. **Link Interactions**:
   - On process detail, click "Add" in Interactions section
   - Select contact (from process's company), role title autofills
   - Select type, category
   - Submit → Creates interaction with `process_id` set
   - Interaction appears in process timeline

### Workflow 3: Track Recruiter Performance

1. **Mark Company as Recruiter**:
   - Create/edit company → Set type to "Recruiter"

2. **Create Interactions via Recruiter**:
   - When creating interaction → Set source type to "Via Recruiter"
   - Select recruiter company from dropdown
   - Submit → Interaction has `source_type="Via Recruiter"` and `recruiter_id`

3. **View Performance**:
   - Navigate to recruiter company detail → "Performance" tab
   - Stats auto-load: Total mandates, Interviews, Offers, Rejections, Active, Conversion rate
   - Dashboard also shows "Recruiter Overview" section with top 5 recruiters

### Workflow 4: Follow-up Management

1. **Set Follow-up Date**:
   - Edit interaction (Sheet from interactions list) → Set "Next follow-up date"
   - Auto-saves after 500ms (InteractionForm debounce). No manual Save needed for single-field change.

2. **View Overdue/Upcoming**:
   - **Follow-up severity algorithm** (lib/follow-up.ts): (1) If next_follow_up_date is set and <= today → red. (2) Else if status !== "Waiting" or no date_sent → normal. (3) Else days since date_sent: 0–13 → normal, 14–27 → orange, 28+ → red.
   - Dashboard: "Overdue follow-ups" = items with severity red; "Upcoming follow-ups" = items with severity orange.
   - Interactions list: FollowUpBadge shows "Overdue" (red) or "Soon" (orange) when severity !== normal; row background also red/orange tint.
   - Company detail interactions tab: Row border/background red or orange by severity.
   - Process detail interactions: Same row background by severity.

---

## Cross-Page Linking Patterns

### Linking from Interactions

- **Company name** → `/companies/[companyId]`
- **Recruiter badge** → `/companies/[recruiterId]`
- **Process badge** → `/processes/[processId]`
- **Row click** → Opens Sheet with `InteractionForm` (edit inline)

### Linking from Processes

- **Company logo/name** → `/companies/[companyId]`
- **Source process link** → `/processes/[sourceProcessId]`
- **Child process** → `/processes/[childId]`
- **Interaction in timeline** → `/interactions?highlight=[id]`

### Linking from Companies

- **Interaction row** → `/interactions?highlight=[id]`
- **Process card** → `/processes/[processId]`
- **Contact card** → Stays on same page (scrolls to contact in People tab)

### Linking from Dashboard

- **Stat cards** → `/processes` or `/interactions`
- **Interaction rows** → `/interactions?highlight=[id]`
- **Recruiter rows** → `/companies/[id]?tab=performance`

### URL Query Params Usage

- `?tab=interactions|processes|people|performance` → Controls default tab on company detail
- `?highlight=[id]` → Highlights specific interaction in interactions list
- `?new=true` → Opens create dialog on processes list
- `?company=[id]` → Preselects company in process create dialog

---

## Form Interactions & Cascading Dropdowns

### New Interaction Form

**Cascading Logic**:
1. User selects Company → `getContactsForCompany(companyId)` → Contact dropdown populates
2. User selects Contact → If contact has `exactTitle`, role title autofills
3. User selects Source Type → If "Via Recruiter", `getRecruitersForSelect()` → Recruiter dropdown appears

**State Management**:
- `companyId` → triggers `useEffect` → loads contacts → clears `contactId`
- `contactId` → triggers `useEffect` → autofills `roleTitle` (if not manually edited)
- `sourceType` → triggers `useEffect` → loads recruiters if "Via Recruiter"

**Validation**:
- Company required
- Contact required
- If sourceType="Via Recruiter", recruiterId required
- Server action validates recruiter is type="Recruiter"

### New Process Form

**Cascading Logic**:
1. User selects Company → No cascade (process doesn't need contact)
2. User selects Source Process → Filters out Closed/Rejected processes from dropdown

**Preselection**:
- If URL has `?company=[id]`, companyId preset via `useEffect`

### Contact Form

**LinkedIn Autofill**:
- User pastes LinkedIn URL → Clicks "Autofill" → `parseLinkedInProfile()` → Fills firstName, lastName, exactTitle (only if fields empty)

**Manager Dropdown**:
- Shows existing contacts at same company (excluding self if editing)
- Self-referential: managerId → Contact.id

**New Interaction (main list) vs Add Interaction (process detail)**:
- **Main list** (InteractionsClient): Company + Contact (cascading), role title (autofill from contact), type, status, priority, category, date sent, comment, source type, recruiter (if Via Recruiter). No process_id. createInteraction(...) then onOpenChange(false), reset form, onCreated() (refetch).
- **Process detail** (ProcessDetailClient): Contact only (from process's company), role title (autofill), type, category. process_id is always the current process. createInteraction(..., process_id: processId) then onOpenChange(false), router.refresh(). If no contacts, link to `/companies/[companyId]?tab=people` "Add one first".

**InteractionForm (edit) — fields and debounce**:
- Editable fields: roleTitle, globalCategory, type, status, priority, dateSent, lastUpdate, nextFollowUpDate, outcome, comment, sourceType, recruiterId. Company, contact, and process_id are not editable (not in form).
- Debounce: DEBOUNCE_MS = 500. patch(setter, value) sets value and setDirty(true). useEffect depends on [dirty, ...all field values, save]. When dirty is true, effect runs setTimeout(save, 500); save() calls updateInteraction(id, data), setDirty(false), onSaved?.(). Cleanup clears timeout. So any change marks dirty; 500ms after last change, save runs once.

---

## Search & Filtering System

### Global Search (`Cmd+K` / `Ctrl+K`)

**Component**: `SearchDialog` (triggered from header)

**Search Scope** (app/actions/search.ts):
- Companies: `name` contains query (case-insensitive), take 5. href `/companies/[id]`, subtitle "Company".
- Contacts: OR on firstName, lastName, email, exactTitle contains query (case-insensitive), take 10. href `/companies/[companyId]?tab=people`, subtitle exactTitle or email.
- Interactions: `roleTitle` contains query (case-insensitive), take 5. href `/interactions?highlight=[id]`, subtitle "Interaction".
- Processes: OR on roleTitle, location, or company.name contains query (case-insensitive), take 5. href `/processes/[id]`, subtitle "Process — [company name]" or "Process".
- All hits combined in one flat list (no grouping by type in UI; SearchDialog renders list with icon per type).

**Results Display**:
- Grouped by type (icon + title + subtitle)
- Links to appropriate page:
  - Company → `/companies/[id]`
  - Contact → `/companies/[companyId]?tab=people`
  - Interaction → `/interactions?highlight=[id]`

**Debouncing**: 200ms delay before search executes

### Interactions List Filters

**Filter Types**:
- Status (dropdown)
- Company (dropdown)
- Priority (dropdown)
- Category (dropdown)
- Process (dropdown: "All", "No process", or specific process)
- Date From/To (date inputs)

**Filter Logic**:
- All filters combined with AND
- Process filter: "none" filters for `process_id === null`
- Date filters: `date_sent >= dateFrom` AND `date_sent <= dateTo`

**State**:
- Each filter in separate state variable
- `hasFilters` computed from all filter states
- "Clear filters" button resets all to defaults

### Companies List Filters

**Filter Types**:
- Type tabs (All, Banks, Hedge Funds, etc.) with counts
- Search by name (text input)

**Filter Logic**:
- Type filter: `type === typeFilter`
- Search: `name.toLowerCase().includes(query)`
- Combined with AND

### Processes List Filters

**Filter Types**:
- Status tabs (All, Active, Interviewing, etc.) with counts
- Search by role title, company name, location (text input)

**Filter Logic**:
- Status filter: `status === filter`
- Search: `roleTitle || companyName || location` contains query
- Combined with AND

### Contacts List Filters

**Filter Types**:
- Search by name, email, exactTitle, company name (text input)

**Filter Logic**:
- Searches across all fields with OR logic

---

## Real-time Updates & Revalidation

### Revalidation Strategy

**After Mutations**:
- `createCompany()` → `revalidatePath("/companies")`
- `updateCompany()` → `revalidatePath("/companies")` + `revalidatePath("/companies/[id]")`
- `deleteCompany()` → `revalidatePath("/companies")`
- `createContact()` → `revalidatePath("/contacts")` + `revalidatePath("/companies/[id]")`
- `updateContact()` → `revalidatePath("/contacts")`
- `createInteraction()` → `revalidatePath("/interactions")` + `revalidatePath("/")` + optionally `revalidatePath("/processes/[id]")`
- `updateInteraction()` → Same as create
- `createProcess()` → `revalidatePath("/processes")` + `revalidatePath("/")` + `revalidatePath("/companies/[id]")`
- `updateProcess()` → `revalidatePath("/processes")` + `revalidatePath("/processes/[id]")` + `revalidatePath("/")`
- `deleteProcess()` → `revalidatePath("/processes")` + `revalidatePath("/")`

### Client-Side Refetching

**Manual Refetch**:
- `InteractionsClient` has `refetch()` function → calls `getInteractionsWithRelations()` → updates `interactions` state
- Called after creating new interaction

**Router Refresh**:
- `router.refresh()` → Triggers server component re-fetch
- Used in Process Detail after status change, interaction add

**Auto-Save**:
- `InteractionForm` auto-saves after 500ms debounce
- No manual refetch needed (revalidation handles it)

### Update Propagation

**Cross-Page Updates**:
- Updating interaction → Revalidates `/interactions`, `/`, and `/processes/[id]` if linked
- Updating process → Revalidates `/processes`, `/processes/[id]`, `/`, `/companies/[id]`
- Deleting process → Unlinks child processes (sets `sourceProcessId = null`) before delete

---

## Summary: How Everything Connects

### Data Flow Summary

1. **Server Components** fetch data on page load
2. **Client Components** receive data as props, manage UI state
3. **User Actions** trigger Server Actions
4. **Server Actions** mutate database, call `revalidatePath()`
5. **Navigation** triggers server component re-fetch (via Next.js cache)
6. **Client Components** receive fresh data, re-render

### Key Integration Points

1. **Company ↔ Contacts ↔ Interactions**:
   - Company detail shows contacts (People tab) and interactions (Interactions tab)
   - Contacts link to interactions via `contact_id`
   - Interactions link to company via `company_id`

2. **Process ↔ Interactions**:
   - Process detail shows linked interactions
   - Interactions can link to process via `process_id`
   - Creating interaction from process detail auto-links it

3. **Recruiter ↔ Interactions**:
   - Interactions can have `source_type="Via Recruiter"` + `recruiter_id`
   - Recruiter company detail shows performance stats
   - Dashboard aggregates recruiter performance

4. **Process ↔ Process** (Source Process):
   - Process can link to source process (self-referential)
   - Process detail shows source process link and child processes
   - Used for tracking recruiter-driven processes

5. **Dashboard Aggregation**:
   - Aggregates interactions (follow-ups, interviews)
   - Aggregates processes (status counts)
   - Aggregates recruiter performance

### Navigation Patterns Summary

- **List → Detail**: Click card/row → Navigate to detail page
- **Detail → List**: Back button → Return to list
- **Create → Detail**: Submit form → Redirect to detail page
- **Cross-Link**: Click badge/link → Navigate to related entity
- **Highlight**: URL query param → Highlights specific item
- **Tab**: URL query param → Controls default tab

---

## Detailed Component Reference

Every client component with file path, props, state, and behavior.

### DashboardClient
- **File**: `app/(protected)/dashboard-client.tsx`
- **Props**: `initialInteractions: InteractionWithRelations[]`, `initialProcesses: ProcessWithRelations[]`
- **State**: None (derived only; no useState for list data). All grouping/counting is computed in render from props.
- **Subcomponents**:
  - `StatCard`: label, value, icon, color, optional href. Renders a card; if href provided, wraps in `<Link>`.
  - `InteractionRow`: `i` (interaction), optional `severity` ("red" | "orange"). Renders one row with company logo, name, contact, date, status badge; recruiter badge if Via Recruiter. Links to `/interactions?highlight=${i.id}`.
  - `SectionBlock`: title, icon, items (interactions), optional severity, emptyMessage, accent. Renders a card with header (icon + title + count) and list of InteractionRows.
  - `RecruiterOverview`: `interactions`. Builds recruiter map from interactions where source_type === "Via Recruiter"; sorts by interviews then mandates; top 5; table with links to `/companies/[id]?tab=performance`.
- **Derived data**: `red` (severity === "red"), `orange` (severity === "orange"), `interview` (status === "Interview"), `recent` (first 8 interactions), `statusCounts`, `processCounts`.
- **Stat card hrefs**: "Active processes" and "Total interactions" link to `/processes` and `/interactions` respectively; Offer/Rejected and interaction-side cards have no href.

### CompaniesClient
- **File**: `app/(protected)/companies/companies-client.tsx`
- **Props**: `initialCompanies: Pick<Company, "id" | "name" | "type" | "main_location" | "website_domain" | "logo_url">[]`
- **State**: `search` (string), `typeFilter` (string, default "all")
- **Computed**: `filtered` (useMemo: filter by typeFilter then by name contains search), `typeCounts` (useMemo: count per type)
- **Filter tabs**: All, Banks, Hedge Funds, Asset Managers, Prop Shops, Recruiters, Other. Tabs with count 0 are hidden.
- **Empty state**: "No companies yet" vs "No companies match your search" depending on initialCompanies.length.

### CompanyDetailClient
- **File**: `app/(protected)/companies/[id]/company-detail-client.tsx`
- **Props**: `company: Company`, `contacts: Contact[]`, `interactions: InteractionWithContact[]`, `processes: ProcessWithRelations[]`, `defaultTab: "interactions" | "people" | "processes" | "performance"`
- **State**: `tab` (string). Initial: if defaultTab === "performance" && !isRecruiter then "interactions", else defaultTab.
- **Subcomponents**:
  - `ContactTree`: contacts, interactions. Builds lastByContact from interactions (max of date_sent/last_update/created_at per contact_id), then buildContactTree(contacts), renders ContactCards in tree order with depth (marginLeft: depth * 16).
  - `ContactCard`: contact, depth, lastContactDate. Renders name, exact_title, seniority badge, lastContactDate (formatted).
  - `RecruiterPerformance`: companyId. useEffect → getRecruiterStats(companyId) → setStats. Renders 6 stat cards or "Loading stats..." or empty message.
  - `ProcessCard`: process. Renders role_title, location, _count.interactions, sourceProcess link text, status badge, updated_at. Links to `/processes/${process.id}`.
- **Tab order in TabsList**: Interactions, Processes, People, then Performance (only if isRecruiter).

### InteractionsClient / InteractionsInner
- **File**: `app/(protected)/interactions/interactions-client.tsx`
- **Props**: `initialInteractions`, `companies`, `processes` (ProcessSelect[] with id, role_title, status, company { id, name })
- **State**: `statusFilter`, `companyFilter`, `priorityFilter`, `categoryFilter`, `processFilter` (default "all"), `dateFrom`, `dateTo`, `selectedId` (string | null), `interactions` (synced from props, updated by refetch()), `showNewDialog`, `showFilters`
- **Filtering (useMemo)**: status, company_id, priority, global_category; processFilter "none" → process_id null, else process_id === processFilter; date_sent >= dateFrom, date_sent <= dateTo. All AND.
- **refetch**: getInteractionsWithRelations() then setInteractions. Called after create and from InteractionForm onSaved.
- **Sheet**: open when selectedId non-null; content is InteractionForm(selectedInteraction, onSaved: refetch, onClose: setSelectedId(null)).
- **NewInteractionDialog**: Does not include process_id. Fields: companyId, contactId, roleTitle (autofill from contact), type, status, priority, category, dateSent, comment, sourceType, recruiterId. Submit → createInteraction(...) → onOpenChange(false) → reset form → onCreated() (refetch).

### ProcessDetailClient
- **File**: `app/(protected)/processes/[id]/process-detail-client.tsx`
- **Props**: process, interactions, childProcesses, allProcesses, companies, contacts
- **State**: `status` (initial process.status), `addDialogOpen`
- **Status change**: setStatus(newStatus) → updateProcess(id, { status }) → router.refresh().
- **Delete**: AlertDialog (inline, not DeleteConfirmDialog). Description: "This will delete the process and unlink all its interactions." handleDelete → deleteProcess(id) → router.push("/processes").
- **AddInteractionDialog**: processId, companyId, contacts. Fields: contactId, roleTitle (autofill), type, category. createInteraction(..., process_id: processId) → onOpenChange(false) → router.refresh(). If contacts.length === 0, shows link to `/companies/${companyId}?tab=people` "Add one first".

### ProcessesClient
- **File**: `app/(protected)/processes/processes-client.tsx`
- **Props**: initialProcesses, companies, allProcesses (ProcessSelect[]), openNew (boolean), preselectedCompanyId (string | undefined)
- **State**: `dialogOpen` (initial: openNew ?? false), `filter` (default "all"), `search`
- **filtered**: useMemo — filter by status then by search (role_title, company.name, location contains)
- **statusCounts**: useMemo — count per status
- **NewProcessDialog**: companyId (initial preselectedCompanyId), roleTitle, location, sourceProcessId. sourceProcess dropdown excludes Closed/Rejected. createProcess(...) → onOpenChange(false) → router.push(`/processes/${id}`).

### ContactsClient
- **File**: `app/(protected)/contacts/contacts-client.tsx`
- **Props**: initialContacts (ContactWithCompany[])
- **State**: `search` (string)
- **filtered**: inline — if q empty then initialContacts; else filter where name/email/exactTitle/companyName contains q (case-insensitive).
- **Link**: Each row → `/companies/${company.id}?tab=people` (or "#" if no company).

### CompanyActions
- **File**: `app/(protected)/companies/[id]/company-actions.tsx`
- **Props**: companyId, companyName
- **State**: deleteOpen, deleting
- **Edit**: Link to `/companies/[id]/edit`
- **Delete**: DeleteConfirmDialog with description including "all contacts and interactions for this company". handleDelete → deleteCompany(id) → router.push("/companies") → router.refresh().

### InteractionForm
- **File**: `components/interaction-form.tsx`
- **Props**: interaction (full Interaction), onSaved?: () => void, onClose?: () => void
- **State**: All fields (roleTitle, globalCategory, type, status, priority, dateSent, lastUpdate, nextFollowUpDate, outcome, comment, sourceType, recruiterId), plus saving, dirty, recruiters (list)
- **Does not edit**: company_id, contact_id, process_id (read-only; not in form).
- **Debounce**: useEffect dependency array includes dirty and all field values; when dirty, setTimeout(save, 500); cleanup clears timeout. patch() sets setter + setDirty(true). Save calls updateInteraction(id, {...}) then setDirty(false), onSaved?.().
- **Recruiter load**: useEffect when sourceType === "Via Recruiter" && recruiters.length === 0 → getRecruitersForSelect() → setRecruiters.

### CompanyForm
- **File**: `components/company-form.tsx`
- **Props**: company?: CompanyEdit (optional; if absent, create mode)
- **Fields**: name, type, main_location, website_domain, logo_url, notes
- **Submit**: createCompany or updateCompany; then router.push(detail) or router.push(edit cancel).

### ContactForm
- **File**: `components/contact-form.tsx`
- **Props**: companyId, contact?: Contact | null, managerOptions?: { id, name }[]
- **LinkedIn**: parseLinkedInProfile(linkedinUrl) → ok ? set first/last/exactTitle only if field empty : setAutofillError. autofilling state during request.
- **Submit**: createContact or updateContact; create → router.push(`/companies/${companyId}?tab=people`) + router.refresh(); update → router.refresh().

### DeleteConfirmDialog
- **File**: `components/delete-confirm-dialog.tsx`
- **Props**: open, onOpenChange, title, description, onConfirm (async), loading?
- **Behavior**: Confirm button calls await onConfirm() then onOpenChange(false). Cancel and Action disabled when loading.

### SearchDialog
- **File**: `components/search/search-dialog.tsx`
- **Context**: useSearchContext() → open, setOpen
- **State**: query, results (SearchHit[]), loading
- **Search**: useEffect with 200ms debounce on query → runSearch(query) → searchAll(q) → setResults.
- **Keyboard**: Cmd/Ctrl+K opens; Escape closes.
- **SearchHit**: type (company|contact|interaction|process), id, href, title, subtitle.

### CompanyLogo
- **File**: `components/company-logo.tsx`
- **Props**: name, logoUrl?, websiteDomain?, size (default 32), className?
- **Priority**: 1) logoUrl if provided; 2) else `https://unavatar.io/${websiteDomain}?fallback=false`; 3) else null (show initials only).
- **State**: imgError, loaded. useEffect resets both when src changes.
- **Initials**: First letter of first two words of name, uppercase; if none, "?".
- **Display**: Initials as background; img on top when showImage (src && !imgError); img onLoad → setLoaded(true); onError → setImgError(true). Font size for initials: max(10, round(size * 0.36)).

---

## Algorithms & Business Logic

### Follow-Up Severity (`lib/follow-up.ts`)

**Input**: Interaction with at least `status`, `date_sent`, `next_follow_up_date` (all optional except status).

**Algorithm**:
1. Let `today` = start of today (00:00:00 local).
2. If `next_follow_up_date` is set:
   - Let `nextDate` = start of that date.
   - If `nextDate <= today` → return **"red"** (overdue).
3. If `status !== "Waiting"` OR `date_sent` is missing → return **"normal"**.
4. Let `sent` = start of `date_sent`; `days` = floor((today - sent) / 1 day).
5. If `days >= 28` → **"red"**; if `days >= 14` → **"orange"**; else **"normal"**.

**Usage**: Dashboard (red/orange sections), Interactions list (row background + FollowUpBadge), Company detail interactions tab (row border), Process detail interactions (row background).

**`isOverdueFollowUp`**: Returns true only when `next_follow_up_date` is set and <= today (no status check).

### Recruiter Stats (`getRecruiterStats(recruiterId)`)

**Query**: All interactions where `userId` and `recruiterId` match; select only `status`, `outcome`.

**Counts** (per interaction, can double-count):
- **interviews**: status === "Interview" OR outcome === "Interview".
- **offers**: status === "Offer" OR outcome === "Offer".
- **rejections**: status === "Rejected" OR outcome === "Rejected".
- **active**: status !== "Rejected" AND status !== "Closed" AND outcome !== "Rejected".

**Return**: `{ total, interviews, offers, rejections, active, conversionRate }` where `conversionRate = total > 0 ? round((interviews / total) * 100) : 0`.

### Contact Tree (`buildContactTree(contacts)`)

**Input**: Array of Contact (with `id`, `manager_id`).

**Steps**:
1. Build `roots`: every contact where `manager_id` is null/undefined.
2. Build `children`: Map<manager_id, Contact[]> of contacts that have that manager_id.
3. Sort roots by seniority: SENIORITY_ORDER (Partner=0, MD=1, Director=2, VP=3, Associate=4, Analyst=5, HR=6, Recruiter=7, Other=8). Ascending order so Partner first.
4. Sort each children list by same seniority order.
5. Return `{ roots: sortedRoots, children }`.

**Last contact date** (in ContactTree): For each interaction, key = date_sent ?? last_update ?? created_at (string). For each contact_id, keep the max key. ContactCard receives lastContactDate = that max for contact.id (formatted with formatDate).

### Dashboard Recruiter Overview (client-side)

**Input**: initialInteractions.

**Logic**: For each interaction where source_type === "Via Recruiter" and recruiter exists, aggregate by recruiter.id: mandates (count), interviews (status or outcome Interview), offers (status or outcome Offer). Sort by interviews desc then mandates desc; take top 5. Table rows link to `/companies/${r.id}?tab=performance`.

### formatDate (`lib/utils.ts`)

**Input**: dateStr (string, any format parseable by `new Date()`).

**Output**: DD/MM/YYYY (European style). Uses getUTCDate(), getUTCMonth()+1, getUTCFullYear(); pads day and month with "0".

---

## Server Actions Reference

| Action | File | Signature (summary) | Return | Revalidation |
|--------|------|---------------------|--------|--------------|
| getCompanies | companies.ts | () | Company[] (API shape) | — |
| getCompanyById | companies.ts | (id: string) | Company \| null | — |
| createCompany | companies.ts | (data) | { id } | /companies |
| updateCompany | companies.ts | (id, data) | void | /companies, /companies/[id] |
| deleteCompany | companies.ts | (id: string) | void | /companies |
| getContactsWithCompany | contacts.ts | () | ContactWithCompany[] | — |
| createContact | contacts.ts | (data) | void | /contacts, /companies/[id] |
| updateContact | contacts.ts | (id, data) | void | /contacts |
| getInteractionsWithRelations | interactions.ts | () | InteractionWithRelations[] | — |
| getInteractionsForDashboard | interactions.ts | () | same | — |
| getCompaniesForSelect | interactions.ts | () | { id, name }[] | — |
| getRecruitersForSelect | interactions.ts | () | { id, name }[] (type Recruiter) | — |
| getRecruiterStats | interactions.ts | (recruiterId) | { total, interviews, offers, rejections, active, conversionRate } \| null | — |
| updateInteraction | interactions.ts | (id, data) | void | /interactions, /, /processes/[id] if data.process_id |
| createInteraction | interactions.ts | (data) | interaction.id (string) | /interactions, /, /processes/[id] if process_id |
| getContactsForCompany | interactions.ts | (companyId) | { id, firstName, lastName }[] | — |
| getProcesses | processes.ts | () | ProcessWithRelations[] | — |
| getProcessById | processes.ts | (id) | ProcessWithRelations \| null | — |
| getProcessesForCompany | processes.ts | (companyId) | ProcessWithRelations[] | — |
| getProcessesForDashboard | processes.ts | () | ProcessWithRelations[] | — |
| getProcessesForSelect | processes.ts | () | { id, role_title, status, company }[] | — |
| createProcess | processes.ts | (data) | process.id (string) | /processes, /, /companies/[id] |
| updateProcess | processes.ts | (id, data) | void | /processes, /processes/[id], / |
| deleteProcess | processes.ts | (id) | void | /processes, / |
| getInteractionsForExport | settings.ts | () | ExportRow[] \| null | — |
| searchAll | search.ts | (query: string) | SearchHit[] | — |
| parseLinkedInProfile | linkedin.ts | (url: string) | { ok, profile } \| { ok: false, error } | — |

**Validation**: updateInteraction/createInteraction: if source_type "Via Recruiter" then recruiter_id required; recruiter must be user's company with type Recruiter. createProcess: company and role_title required; company must belong to user; source_process_id if provided must exist and belong to user. updateProcess: source_process_id cannot equal id (no self-reference).

---

## Revalidation Map

After each mutation, these paths are revalidated (exact strings passed to revalidatePath):

- **createCompany**: `/companies`
- **updateCompany**: `/companies`, `/companies/${id}`
- **deleteCompany**: `/companies`
- **createContact**: `/contacts`, `/companies/${company_id}`
- **updateContact**: `/contacts`
- **createInteraction**: `/interactions`, `/`; if `data.process_id` then `/processes/${data.process_id}`
- **updateInteraction**: `/interactions`, `/`; if `data.process_id` then `/processes/${data.process_id}`
- **createProcess**: `/processes`, `/`, `/companies/${company_id}`
- **updateProcess**: `/processes`, `/processes/${id}`, `/`
- **deleteProcess**: `/processes`, `/`

No revalidation in getters or in settings/search/linkedin actions.

---

## Edge Cases & Empty States

- **Company detail, Performance tab**: If defaultTab is "performance" but company.type !== "Recruiter", tab state initializes to "interactions" so user never sees a blank Performance tab.
- **Company detail, People tab**: ContactTree shows "No contacts yet" when roots.length === 0. "Add contact" links to `/companies/[id]/contacts/new`.
- **Company detail, Processes tab**: "No processes yet" when processes.length === 0. "New process" links to `/processes?new=true&company=[id]`.
- **Company detail, Interactions tab**: "No interactions yet" when interactions.length === 0.
- **RecruiterPerformance**: Loading state "Loading stats..."; no stats "No mandates tracked via this recruiter yet"; then 6 stat cards.
- **Interactions list**: Empty filtered list shows "No interactions match your filters" vs "No interactions yet" when interactions.length === 0. Clear filters button (X) only when hasFilters.
- **New Interaction (main)**: Contact dropdown disabled until company selected; placeholder "Pick company first" / "No contacts — add one first" when no contacts. Links "+ New company" and "+ Add contact" close dialog and navigate.
- **Add Interaction (process detail)**: If contacts.length === 0, message with link to `/companies/[companyId]?tab=people` "Add one first".
- **Process delete**: AlertDialog says "unlink all its interactions" — in DB, interactions with this process_id are CASCADE deleted, not unlinked. (Copy is slightly misleading.)
- **Company delete**: DeleteConfirmDialog explains "all contacts and interactions for this company" will be deleted (CASCADE).
- **InteractionForm**: Does not expose company/contact/process; changing recruiter to Direct clears recruiterId. Server validates Via Recruiter + recruiter_id.
- **LinkedIn parseLinkedInProfile**: Timeout 10s; invalid URL or non-LinkedIn host returns error; HTTP !ok returns error; missing og:title returns error. Only fills firstName, lastName, exactTitle (and companyGuess not used in form).

---

## Shared Utilities & Subcomponents

- **cn**: `lib/utils.ts` — clsx + twMerge for class names.
- **formatDate**: `lib/utils.ts` — date string → "DD/MM/YYYY" (UTC).
- **getFollowUpSeverity**: `lib/follow-up.ts` — "normal" | "orange" | "red".
- **isOverdueFollowUp**: `lib/follow-up.ts` — boolean from next_follow_up_date.
- **CompanyLogo**: Used in dashboard, company cards, company detail header, process cards, process detail header, interaction rows (company logo).
- **DeleteConfirmDialog**: Used only for company delete (CompanyActions). Process delete uses inline AlertDialog.
- **Tabs (ShadCN)**: Company detail (Interactions, Processes, People, Performance).
- **Sheet (ShadCN)**: Interactions list (slide-over for InteractionForm).
- **Dialog (ShadCN)**: New Interaction (main), New Process, Add Interaction (process), Search.
- **AlertDialog (ShadCN)**: Process delete confirmation.

**Search scope**: Companies (name contains, take 5), Contacts (firstName/lastName/email/exactTitle contains, take 10), Interactions (roleTitle contains, take 5), Processes (roleTitle or location or company.name contains, take 5). All case-insensitive. Hits link: company → `/companies/[id]`, contact → `/companies/[companyId]?tab=people`, interaction → `/interactions?highlight=[id]`, process → `/processes/[id]`.

---

## File Index (Key Implementation Files)

| Path | Purpose |
|------|--------|
| `app/(protected)/page.tsx` | Dashboard server: fetches interactions + processes, renders DashboardClient |
| `app/(protected)/dashboard-client.tsx` | Dashboard client: stat cards, sections, recruiter overview |
| `app/(protected)/companies/page.tsx` | Companies list server |
| `app/(protected)/companies/companies-client.tsx` | Companies list client: filter tabs, search, grid |
| `app/(protected)/companies/[id]/page.tsx` | Company detail server: company, contacts, interactions, processes, defaultTab |
| `app/(protected)/companies/[id]/company-detail-client.tsx` | Company detail client: tabs (Interactions, Processes, People, Performance) |
| `app/(protected)/companies/[id]/company-actions.tsx` | Edit/Delete company; uses DeleteConfirmDialog for delete |
| `app/(protected)/companies/new/page.tsx` | New company page (server) |
| `app/(protected)/companies/[id]/edit/page.tsx` | Edit company page (server) |
| `app/(protected)/companies/[id]/contacts/new/page.tsx` | New contact page (server) |
| `app/(protected)/contacts/page.tsx` | Contacts list server |
| `app/(protected)/contacts/contacts-client.tsx` | Contacts list client: search, list with company link |
| `app/(protected)/interactions/page.tsx` | Interactions list server: interactions, companies, processes |
| `app/(protected)/interactions/interactions-client.tsx` | Interactions list client: filters, table/cards, Sheet (InteractionForm), NewInteractionDialog |
| `app/(protected)/processes/page.tsx` | Processes list server: processes, companies, allProcesses, openNew, preselectedCompanyId |
| `app/(protected)/processes/processes-client.tsx` | Processes list client: filter tabs, search, NewProcessDialog |
| `app/(protected)/processes/[id]/page.tsx` | Process detail server: process, interactions, childProcesses, companies, contacts |
| `app/(protected)/processes/[id]/process-detail-client.tsx` | Process detail client: status, delete, AddInteractionDialog, interactions timeline |
| `app/(protected)/settings/page.tsx` | Settings page (server) |
| `app/(protected)/settings/settings-client.tsx` | Export CSV, sign out |
| `app/actions/companies.ts` | getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany |
| `app/actions/contacts.ts` | getContactsWithCompany, createContact, updateContact |
| `app/actions/interactions.ts` | getInteractionsWithRelations, getInteractionsForDashboard, getCompaniesForSelect, getRecruitersForSelect, getRecruiterStats, updateInteraction, createInteraction, getContactsForCompany |
| `app/actions/processes.ts` | getProcesses, getProcessById, getProcessesForCompany, getProcessesForDashboard, getProcessesForSelect, createProcess, updateProcess, deleteProcess |
| `app/actions/settings.ts` | getInteractionsForExport |
| `app/actions/search.ts` | searchAll (companies, contacts, interactions, processes) |
| `app/actions/linkedin.ts` | parseLinkedInProfile (og:title/og:description parser) |
| `components/company-form.tsx` | Create/edit company form |
| `components/contact-form.tsx` | Create/edit contact form; LinkedIn autofill |
| `components/interaction-form.tsx` | Edit interaction form (debounced auto-save); used in Sheet and not for create |
| `components/company-logo.tsx` | Logo or initials; logoUrl → unavatar.io → initials |
| `components/delete-confirm-dialog.tsx` | Reusable confirm dialog (used for company delete) |
| `components/search/search-dialog.tsx` | Global search dialog (Cmd+K); uses searchAll |
| `lib/follow-up.ts` | getFollowUpSeverity, isOverdueFollowUp |
| `lib/utils.ts` | cn, formatDate (DD/MM/YYYY) |
| `lib/map-prisma.ts` | Enum mapping Prisma ↔ API (companyType, interactionStatus/Type, sourceType, processStatus) |
| `lib/session.ts` | getCurrentUserId (used by all actions) |
| `prisma/schema.prisma` | Full schema (User, Company, Contact, Interaction, Process, enums) |

---

**End of Complete System Guide**
