# WarRoom — Project Brief

## Overview

**WarRoom** is a single-user CRM (Customer Relationship Management) web application purpose-built for tracking finance job applications. It allows a candidate to organize companies, contacts, and interactions (applications, cold emails, referrals, interviews, etc.) in one strategic dashboard.

- **Production URL:** https://war-room-anthony-nadjaris-projects.vercel.app
- **GitHub:** https://github.com/AnthonyNadjari/WarRoom

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 14** (App Router, TypeScript) |
| Styling | **Tailwind CSS** + **ShadCN UI** (Radix primitives) |
| ORM | **Prisma v7** with `@prisma/adapter-pg` driver adapter |
| Database | **Neon PostgreSQL** (serverless, free tier, connection pooler) |
| Auth | **NextAuth v4** (Credentials provider, JWT strategy, bcryptjs) |
| Deployment | **Vercel** (auto-deploy on push to `main`) |
| Icons | **Lucide React** |

---

## Architecture

```
WarRoom/
├── app/
│   ├── layout.tsx                  # Root layout (AuthProvider, metadata, favicon)
│   ├── error.tsx                   # Global error boundary
│   ├── not-found.tsx               # Global 404 page
│   ├── login/page.tsx              # Login page (card UI, Suspense-wrapped)
│   ├── api/auth/[...nextauth]/     # NextAuth API route
│   └── (protected)/                # Auth-gated route group
│       ├── layout.tsx              # Sidebar + Header + MobileNav shell
│       ├── error.tsx               # Protected-area error boundary
│       ├── page.tsx                # Dashboard (server component → client)
│       ├── dashboard-client.tsx    # Rich dashboard with stat cards
│       ├── companies/              # Company CRUD pages
│       ├── contacts/               # Contact CRUD pages
│       ├── interactions/           # Interaction list + creation dialog
│       └── settings/               # Export CSV + sign out
├── app/actions/                    # Server Actions (all "use server")
│   ├── companies.ts                # getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany
│   ├── contacts.ts                 # getContactsWithCompany, createContact, updateContact
│   ├── interactions.ts             # getInteractionsWithRelations, createInteraction, updateInteraction, getContactsForCompany, getCompaniesForSelect
│   └── settings.ts                 # getInteractionsForExport
├── components/
│   ├── layout/                     # Sidebar, Header, MobileNav
│   └── ui/                         # ShadCN components (Button, Dialog, Select, Tabs, etc.)
├── lib/
│   ├── auth.ts                     # NextAuth config (Credentials + JWT + PrismaAdapter)
│   ├── prisma.ts                   # Prisma client singleton (v7 adapter pattern)
│   ├── session.ts                  # getSession(), getCurrentUserId() helpers
│   └── map-prisma.ts               # Enum conversion (Prisma PascalCase ↔ API display names)
├── prisma/
│   ├── schema.prisma               # Full DB schema (models + enums)
│   ├── seed.ts                     # User seeding script
│   └── migrations/                 # Migration history
├── middleware.ts                    # JWT-based route protection
├── types/database.ts               # Shared TypeScript types
├── vercel.json                     # Vercel framework config
└── prisma.config.ts                # Prisma v7 config (no URL in schema)
```

---

## Data Model

### Entities

1. **User** — Single user (email + bcrypt password hash). All data is scoped to this user.
2. **Company** — A firm the user is targeting (bank, hedge fund, asset manager, recruiter firm, other).
3. **Contact** — A person at a company (with title, category, seniority, email, phone, LinkedIn, hierarchical manager relationship).
4. **Interaction** — A specific touchpoint: application, cold email, LinkedIn message, call, or referral — linked to a company and a contact.

### Enums

| Enum | Values |
|---|---|
| CompanyType | Bank, Hedge Fund, Asset Manager, Recruiter Firm, Other |
| ContactCategory | Sales, Trading, Structuring, Investment, HR, Recruiter, Other |
| Seniority | Analyst, Associate, VP, Director, MD, Partner, HR, Recruiter, Other |
| InteractionGlobalCategory | Sales, Trading, Structuring, Investment, Other |
| InteractionType | Official Application, LinkedIn Message, Cold Email, Call, Referral |
| InteractionStatus | Sent, Waiting, Follow-up, Interview, Offer, Rejected, Closed |
| Priority | Low, Medium, High |
| Outcome | None, Rejected, Interview, Offer |

### Relationships

- User → has many Companies, Contacts, Interactions
- Company → has many Contacts, Interactions
- Contact → belongs to Company, has optional manager (self-referential), has many Interactions
- Interaction → belongs to Company + Contact

---

## Features

### 1. Authentication
- Email/password login with bcryptjs hashing
- JWT-based sessions (30-day expiry)
- Middleware protects all routes except `/login` and `/api/auth/*`
- Unauthenticated users are redirected to `/login`

### 2. Dashboard (`/`)
- **Stat cards**: Total interactions, active interviews, pending follow-ups, overdue items
- **Recent interactions list** with color-coded status badges
- **Quick navigation** to all sections

### 3. Companies (`/companies`)
- **Card grid layout** with colored type badges (Bank = blue, Hedge Fund = purple, etc.)
- **Search filter** by company name
- **CRUD**: Create, view detail, edit, delete
- **Company detail page** (`/companies/[id]`) with tabs:
  - **Interactions tab**: All interactions with this company
  - **People tab**: Contacts at this company with hierarchical org-chart display (manager → reports)

### 4. Contacts (`/contacts`)
- **List view** with avatar initials, title, email, company name
- **Search filter** by name
- **Create contact** with company selection, manager dropdown (self-referential hierarchy)
- Contact linked to company detail page

### 5. Interactions (`/interactions`)
- **Full interaction list** with:
  - Status badges (color-coded: Sent, Waiting, Follow-up, Interview, Offer, Rejected, Closed)
  - Priority indicators (High = red dot, Medium = yellow, Low = green)
  - Follow-up date warnings
- **Collapsible filters panel**: Filter by status, company, priority, category
- **New Interaction Dialog**:
  - Select company → cascading contact dropdown (loads contacts for selected company)
  - Set role title, type, status, priority, category, date, comment
- **Inline editing** of interaction fields
- **Two view modes**: Table view and card view

### 6. Settings (`/settings`)
- **Export to CSV**: Downloads all interactions with company/contact data as a CSV file
- **Sign out**: Ends session and redirects to login

### 7. UI/UX
- **Dark navy sidebar** with shield/crosshair logo and navigation links
- **Responsive**: Sidebar collapses to mobile bottom nav on small screens
- **Glass-card design** with subtle backdrop blur
- **Blue-to-indigo color scheme** throughout
- **Custom favicon** (SVG shield with crosshair gradient)
- **Error boundaries** at root and protected layout levels
- **Custom 404 page**

---

## Server Actions

All data operations use Next.js Server Actions (`"use server"`) — no API routes needed for CRUD. Each action verifies the user session and scopes queries to `userId`.

| Action | File | Purpose |
|---|---|---|
| `getCompanies()` | companies.ts | List all companies |
| `getCompanyById(id)` | companies.ts | Single company detail |
| `createCompany(data)` | companies.ts | Create company |
| `updateCompany(id, data)` | companies.ts | Update company |
| `deleteCompany(id)` | companies.ts | Delete company + cascade |
| `getContactsWithCompany()` | contacts.ts | List contacts with company name |
| `createContact(data)` | contacts.ts | Create contact |
| `updateContact(id, data)` | contacts.ts | Update contact |
| `getInteractionsWithRelations()` | interactions.ts | List all interactions with company/contact |
| `getInteractionsForDashboard()` | interactions.ts | Dashboard data |
| `createInteraction(data)` | interactions.ts | Create new interaction |
| `updateInteraction(id, data)` | interactions.ts | Update interaction fields |
| `getCompaniesForSelect()` | interactions.ts | Company dropdown data |
| `getContactsForCompany(companyId)` | interactions.ts | Cascading contact dropdown |
| `getInteractionsForExport()` | settings.ts | CSV export data |

---

## Security

- All database queries are scoped to the authenticated user's `userId`
- Passwords hashed with bcryptjs (10 salt rounds)
- JWT tokens signed with `NEXTAUTH_SECRET`
- Middleware blocks unauthenticated access to all protected routes
- No sensitive data exposed to the client (server actions handle all DB queries)
- Environment variables stored in Vercel (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)

---

## Deployment Pipeline

1. Push to `main` branch on GitHub
2. Vercel auto-detects the push and triggers a build
3. `postinstall` script runs `prisma generate` (generates Prisma client)
4. `next build` compiles the app
5. Deployed to Vercel's edge network (serverless functions in `iad1` region)
6. Neon PostgreSQL database is accessed via connection pooler URL

---

## Key Technical Decisions

1. **Prisma v7 adapter pattern**: Prisma v7 removed `url` from the schema datasource. We use `@prisma/adapter-pg` with `PrismaPg` adapter in `lib/prisma.ts` and configure the connection string via `prisma.config.ts`.

2. **bcryptjs over bcrypt**: Native `bcrypt` doesn't have prebuilt binaries for Vercel's Node.js 24 Linux runtime. `bcryptjs` is a pure JS drop-in replacement.

3. **Enum mapping layer** (`lib/map-prisma.ts`): Prisma uses PascalCase enum values (e.g., `FollowUp`, `HedgeFund`), but the UI displays human-readable names (e.g., "Follow-up", "Hedge Fund"). A bidirectional mapping layer handles conversion.

4. **Server Actions over API routes**: All CRUD operations use Next.js Server Actions for type-safe, direct server-client communication without REST boilerplate.

5. **Single-user design**: No multi-tenancy. The app is designed for one person managing their own job search pipeline. All queries filter by the single authenticated user's ID.

---

## Current Credentials

- **Email:** anthony@warroom.app
- **Password:** WarRoom2026!

---

## Potential Improvements (Not Yet Implemented)

- Email/calendar integration for follow-up reminders
- Drag-and-drop Kanban board view for interaction pipeline
- Analytics dashboard (application success rate, response time trends)
- Multi-user support with invitations
- File attachments (resume versions, cover letters per company)
- Dark mode toggle
- Bulk import from CSV/LinkedIn
- Mobile PWA support
