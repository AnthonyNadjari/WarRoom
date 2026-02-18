# WarRoom

Personal strategic CRM for finance job applications. Single-user, production-ready web app.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **ShadCN UI** (Radix primitives)
- **Prisma** + **Neon** PostgreSQL
- **NextAuth v4** (Credentials provider)
- **Vercel**-ready

## Setup

1. Clone and install:

   ```bash
   npm install
   ```

2. Create a [Neon](https://neon.tech) PostgreSQL database.

3. Add environment variables:

   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your Neon connection string
   - Set `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - Set `NEXTAUTH_URL` to `http://localhost:3000` for local dev

4. Run Prisma migrations:

   ```bash
   npx prisma migrate dev
   ```

5. Create your user (single-user app). Open a Prisma console and insert a user with a bcrypt-hashed password:

   ```bash
   npx prisma studio
   ```

   Or use a seed script to create the initial user.

6. Run the app:

   ```bash
   npm run dev
   ```

7. Sign in at `/login` with your email and password.

## Features

- **Auth**: Email + password (NextAuth Credentials), protected routes, redirect to `/login` when unauthenticated.
- **Dashboard**: Red / orange / interview / recently sent sections, sorted by `date_sent`.
- **Companies**: List, create, edit, delete (with confirmation). Company detail with **Interactions** and **People** tabs.
- **People**: Hierarchical list by seniority, optional `manager_id` indent. Add contact from company People tab.
- **Interactions**: Table (desktop) / cards (mobile), filters (status, company, priority, category, date range). Slide-over detail with auto-save + manual Save.
- **Follow-up logic**: Waiting 0–13 days normal, 14–27 orange, 28+ red; `next_follow_up_date` ≤ today overrides to red.
- **Global search**: Cmd+K (desktop) or search icon; company, contact, role, email.
- **Theme**: Light default, dark toggle (top right), persisted in `localStorage`.
- **Settings**: Export interactions to CSV, sign out.
- **Delete**: Confirmation modal before delete; cascade deletes in DB.

## Project structure

```
/app
  /(protected)     # Dashboard, companies, contacts, interactions, settings
  /login
  /api/auth        # NextAuth API routes
  /actions         # Server actions (CRUD)
/components        # UI (ShadCN-style) + layout + search + forms + providers
/lib               # auth, session, prisma, map-prisma, utils, follow-up
/types             # DB types, enums, next-auth augmentation
/hooks             # useTheme, useDebounce
/prisma            # schema.prisma
```

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add environment variables in Vercel: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
3. Prisma migrations run automatically via the build command, or add `npx prisma migrate deploy` to your build script.
