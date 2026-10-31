# CampusFlow — setup

The app runs on Next.js 15 (App Router, TypeScript) with NextAuth v5 (Google),
Supabase (Postgres), Resend for email, Google Calendar via `googleapis`, and
Vercel Cron for reminders.

Copy `.env.example` to `.env.local` and fill in the values below.

## 1 — AUTH_SECRET

Generate a random 32-byte string:

```bash
openssl rand -base64 32
```

Paste it into `AUTH_SECRET`. Keep the default `AUTH_URL=http://localhost:3000`
for local dev.

## 2 — Google OAuth 2.0

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Create project → **OAuth 2.0 Client ID** → *Web application*.
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google` (and your
   production URL later).
4. Copy *Client ID* → `GOOGLE_CLIENT_ID`. Copy *Client Secret* →
   `GOOGLE_CLIENT_SECRET`.
5. In **APIs & Services → Library**, enable *Google Calendar API*.
6. Under **OAuth consent screen**, add the scope
   `https://www.googleapis.com/auth/calendar.events` and your test users.

## 3 — Supabase (Postgres)

1. Create a project at <https://supabase.com/dashboard>.
2. **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` **(server only)**
3. In **SQL Editor**, first install the NextAuth schema (one time):

   ```sql
   -- Replicates the Auth.js migration. Also available at
   -- https://authjs.dev/getting-started/adapters/supabase
   create schema if not exists next_auth;
   grant usage on schema next_auth to service_role;
   grant all on schema next_auth to postgres;
   -- Then paste the official next_auth migration from the Auth.js docs link
   -- above. It creates next_auth.users / accounts / sessions / verification_tokens.
   ```

   Open <https://authjs.dev/getting-started/adapters/supabase> and run the SQL
   block titled *"Create the Supabase schema"*.

4. Now run `supabase/schema.sql` from this repo in the same SQL Editor. It
   creates our app tables, RLS policies, and the trigger that provisions
   `user_profiles` for every new user.

## 4 — Resend (email reminders)

1. Sign up at <https://resend.com>. Verify a sending domain (or use their
   onboarding sandbox for first tests).
2. Create an API key → `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a verified sender, e.g.
   `"CampusFlow <reminders@your-domain.com>"`.

## 5 — Vercel Cron (production reminders)

- Deploy to Vercel. `vercel.json` already schedules `/api/cron/reminders`
  every 5 minutes.
- Set `CRON_SECRET` in Vercel's project env. Vercel Cron sends the header
  `Authorization: Bearer $CRON_SECRET` automatically — our handler rejects
  requests without it.

For local testing, run the cron by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## 6 — Run

```bash
cd campusflow-app
npm install
npm run dev
```

Open <http://localhost:3000>, sign in with Google, pick a role, start adding
tasks.

---

## 7 — Production deploy on Vercel

The project is live on Vercel after the first green build on `main`.

**Live URL:** `https://<YOUR_VERCEL_URL>`  — grab it from
<https://vercel.com/dashboard> → the `CampusFlow` project → **Domains**.
Fill it in everywhere `<YOUR_VERCEL_URL>` appears below.

### Google OAuth redirect URI (production)

In Google Cloud Console → **APIs & Services → Credentials → your OAuth 2.0
Client ID**, under **Authorized redirect URIs**, add exactly:

```
https://<YOUR_VERCEL_URL>/api/auth/callback/google
```

Keep the `http://localhost:3000/api/auth/callback/google` entry too for local
dev. Save.

### Vercel environment variables — manual checklist

Set each one at Vercel → **Project → Settings → Environment Variables** for
*Production* (and *Preview* if you want preview deploys to work). Then redeploy.

| # | Name | Value |
|---|------|-------|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon public` |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (server only) |
| 4 | `AUTH_SECRET` | `openssl rand -base64 32` |
| 5 | `AUTH_URL` *(and `NEXTAUTH_URL` for compatibility)* | `https://<YOUR_VERCEL_URL>` |
| 6 | `GOOGLE_CLIENT_ID` | Google Cloud → OAuth client |
| 7 | `GOOGLE_CLIENT_SECRET` | Google Cloud → OAuth client |
| 8 | `RESEND_API_KEY` | Resend → API Keys |
| 9 | `EMAIL_FROM` | e.g. `"CampusFlow <reminders@your-domain.com>"` (verified sender) |
| 10 | `CRON_SECRET` | Any random string; Vercel Cron sends `Authorization: Bearer $CRON_SECRET` |

Variables listed as "server only" must **not** have `NEXT_PUBLIC_` in front —
anything with that prefix is shipped to the browser.

### Database migration

Before the first production sign-in, run two SQL blocks in Supabase → **SQL
Editor**:

1. **Auth.js `next_auth` schema** — paste the migration from
   <https://authjs.dev/getting-started/adapters/supabase> (section
   *"Create the Supabase schema"*). It creates
   `next_auth.users / accounts / sessions / verification_tokens`.
2. **App tables + RLS** — paste `supabase/schema.sql` from this repo.
   Creates `user_profiles`, `semesters`, `subjects`, `tasks`,
   `reminder_log`, `timer_sessions`, enables RLS with per-user policies,
   and installs the trigger that provisions a profile row for each new
   user.

### Cron

`vercel.json` schedules `/api/cron/reminders` daily at `09:00 UTC` (Hobby
plan limit). For minute-accurate reminders see [`NOTE.md`](./NOTE.md).

### Confirm it works

1. Visit `https://<YOUR_VERCEL_URL>`.
2. **Sign in with Google** → consent to Calendar access.
3. Pick a role on `/onboarding`.
4. Add a semester, add a task with a due time in the next few minutes.
5. The reminder cron will fire at the next 09:00 UTC run (or sooner via
   cron-job.org — see `NOTE.md`). Calendar sync fires immediately when a
   task has a due time.
