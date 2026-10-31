# CampusFlow

> Your semester, in flow.

One place to manage study and work life. Tasks with priorities, due dates, and
email reminders. Semesters, subjects, roles. Pomodoro timer. Google Calendar
sync.

## Stack

- Next.js 15 (App Router, TypeScript, React 19)
- NextAuth v5 (Auth.js) — Google OAuth, database sessions via Supabase adapter
- Supabase Postgres — per-user RLS; `semesters → subjects → tasks` with
  `ON DELETE CASCADE`
- Zod on every API boundary
- Resend for email, scheduled by Vercel Cron
- `googleapis` for Calendar sync
- Custom CSS (no gradients, no framework) — tokens ported from the design
  reference in `../`

## Run

See [SETUP.md](./SETUP.md) for env setup.

```bash
npm install
npm run dev
```

## Project layout

```
campusflow-app/
├── middleware.ts            # CSP + security headers
├── vercel.json              # cron: /api/cron/reminders every 5 min
├── supabase/schema.sql      # app tables, RLS, triggers
└── src/
    ├── app/
    │   ├── layout.tsx, globals.css, page.tsx
    │   ├── signin/, onboarding/, dashboard/, settings/
    │   └── api/{auth,profile,semesters,subjects,tasks,timer,calendar,cron}/…
    ├── components/
    │   └── PomodoroTimer.tsx
    └── lib/
        ├── auth.ts          # NextAuth config
        ├── supabase.ts      # server client (service role)
        ├── zod.ts           # input schemas
        ├── api.ts           # auth + validation helpers
        ├── email.ts         # Resend wrapper
        ├── calendar.ts      # Google Calendar wrapper
        └── rate-limit.ts    # in-memory sliding window
```

## Security

- Every API route calls `withUser()` → 401 if no session.
- Every DB query filters by `user_id`. RLS is enabled as defense in depth.
- Every API body goes through Zod before touching the DB.
- Service-role Supabase key only on the server (never in `NEXT_PUBLIC_*`).
- Session cookies: httpOnly, secure in production, SameSite=Lax (NextAuth
  defaults; not weakened).
- `middleware.ts` sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy.
- Cron endpoint requires `Authorization: Bearer $CRON_SECRET`.
- No passwords stored — Google OAuth only.
- Email body is HTML-escaped.
- Rate-limiting on `POST /api/semesters` (sample). Add to more routes as needed
  (see `src/lib/rate-limit.ts`).
