# CampusFlow

> Your semester, in flow.

CampusFlow is one calm place to keep your study and work life together.
Students track semesters, subjects and assignments. Teachers plan classes
and grading. Working professionals keep projects, deadlines and meetings in
one list. Everyone gets reminders by email, a Pomodoro timer, and a sync
with Google Calendar.

## Features

- **Sign in with Google** — OAuth 2.0 via NextAuth v5.
- **Pick a role** — Student, Teacher, or Working Professional. The dashboard
  adapts.
- **Tasks** — title, description, due date & time, priority, tag, bind to a
  semester or subject. Views: Today, Upcoming (next 7 days), All, By semester.
  Drag to reorder, click to complete (with strikethrough), edit, delete.
- **Semesters & subjects** — manage from the sidebar. Deleting a semester
  cascades to its subjects and tasks at the database level.
- **Email reminders** — 1 day before, 1 hour before, at the time. Per-task
  toggles plus a global default in settings. Fired by Vercel Cron (every 5
  minutes) → Resend.
- **Google Calendar sync** — tasks with a due time create/update/delete
  events on the user's primary calendar.
- **Pomodoro timer** — configurable work/break, optional task link, soft
  WebAudio chime, logged per session.
- **Dark / light / system** theme.

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **NextAuth v5 (Auth.js)** with Google provider
- **Supabase Postgres** with per-user Row Level Security
- **Zod** on every API boundary
- **Resend** for email, **Vercel Cron** for scheduling
- **googleapis** for Calendar
- Custom CSS, no gradients, design tokens ported from the vanilla reference

## Run locally

```bash
cd campusflow-app
npm install
cp .env.example .env.local        # then fill the values
npm run dev                       # http://localhost:3000
```

## Environment variables

Full list and where to get each one is in [`.env.example`](./.env.example) and
[`SETUP.md`](./SETUP.md). Short version:

| Name | What |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` locally, your prod URL on Vercel |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud → OAuth 2.0 Client |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend dashboard |
| `CRON_SECRET` | Any random string (also set in Vercel) |

Before first sign-in, run the Auth.js `next_auth` migration (link in SETUP.md
step 3), then run `supabase/schema.sql` in the Supabase SQL editor.

## Deploy

1. Push to GitHub.
2. In Vercel, **New Project** → import this repo (root `campusflow-app`).
3. Add every variable above in **Project → Settings → Environment Variables**.
   Set `AUTH_URL` to the Vercel URL once you know it.
4. Add the Vercel URL to Google OAuth **Authorized redirect URIs**:
   `https://<your-app>.vercel.app/api/auth/callback/google`.
5. `vercel.json` already schedules `/api/cron/reminders` every 5 minutes.

See [SETUP.md](./SETUP.md) for the full step-by-step.
