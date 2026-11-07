# NEXUS Progress Tracker

Mobile-first Next.js and TypeScript app for team registration goals, backed by Supabase.

## Run locally

Use Node.js 22 or newer.

```bash
npm ci
npm run dev
```

`npm run build` checks the production build. The Supabase URL and publishable key in `lib/supabase.ts` are intentionally browser-visible; access to records is enforced by Row Level Security. Never put a Supabase secret or service-role key in the app.

## Roles and data

- Administrators create and edit teams, leader accounts, targets, and college assignments. Counts are read-only to admins.
- A leader can view their own team and colleges and update only their own team's Interested, Registered unpaid, and Confirmed paid totals.
- Each college has one nullable team assignment. Saved changes update other signed-in screens through Supabase Realtime.
- A five-stage vector plant grows with confirmed progress and blooms at 100%.

The existing NEXUS Supabase project already has the schema and Edge Function applied. For a fresh project, review and run the SQL files in `supabase/migrations`, deploy `supabase/functions/admin-leaders`, disable public signups, create the first administrator in Auth, and give that user an `admin` row in `profiles`. The Edge Function must verify the caller's token and admin role; its service-role key stays in Supabase.

## Vercel

Import this GitHub repository as a Next.js project with the repository root as the root directory. Vercel can use the included `npm run build` command. Once the production domain is known, set it as the Supabase Auth Site URL and allow that exact origin in the `admin-leaders` Edge Function's CORS list. This permits invitation and password-recovery links to return to the deployed app.

The app does not collect registrations from participants. Leaders report aggregate counts directly.
