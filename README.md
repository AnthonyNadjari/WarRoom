# WarRoom

Personal strategic CRM for finance job applications. Single-user, production-ready web app.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **ShadCN UI** (Radix primitives)
- **Supabase** (PostgreSQL + Auth)
- **Vercel**-ready

## Setup

1. Clone and install:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com). Enable **Email** auth only.

3. Run the schema in the Supabase SQL Editor:

   - Open `supabase/schema.sql` and execute its contents in your project.

4. Add environment variables:

   - Copy `.env.example` to `.env.local`
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase dashboard (Settings → API).

5. Run the app:

   ```bash
   npm run dev
   ```

6. Sign up once via Supabase Auth (e.g. Dashboard → Authentication → Users → Add user), then sign in at `/login`.

## Features

- **Auth**: Email-only, protected routes, redirect to `/login` when unauthenticated.
- **Dashboard**: Red / orange / interview / recently sent sections, sorted by `date_sent`.
- **Companies**: List, create, edit, delete (with confirmation). Company detail with **Interactions** and **People** tabs.
- **People**: Hierarchical list by seniority, optional `manager_id` indent. Add contact from company People tab.
- **Interactions**: Table (desktop) / cards (mobile), filters (status, company, priority, category, date range). Slide-over detail with auto-save + manual Save.
- **Follow-up logic**: Waiting 0–13 days normal, 14–27 orange, 28+ red; `next_follow_up_date` ≤ today overrides to red.
- **Global search**: Cmd+K (desktop) or search icon; company, contact, role, email.
- **Theme**: Light default, dark toggle (top right), persisted in `localStorage`.
- **Settings**: Export interactions to CSV, sign out.
- **Delete**: Confirmation modal before delete; contact delete cascades interactions.

## Project structure

```
/app
  /(protected)     # Dashboard, companies, contacts, interactions, settings
  /login
  /auth/callback
/components        # UI (ShadCN-style) + layout + search + forms
/lib               # Supabase client/server/middleware, utils, follow-up logic
/types             # DB types and enums
/hooks             # useTheme, useDebounce
/supabase          # schema.sql
```

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel environment variables.
3. In Supabase Auth settings, add your Vercel URL to **Redirect URLs** (e.g. `https://your-app.vercel.app/auth/callback`).
