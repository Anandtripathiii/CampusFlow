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
