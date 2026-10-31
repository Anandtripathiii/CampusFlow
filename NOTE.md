# Reminder cron — frequency note

`vercel.json` ships a **daily** cron (`0 9 * * *`, 09:00 UTC) because
Vercel's Hobby plan only allows one run per day.

For minute-accurate reminders you have two options:

## Option A — Vercel Pro ($20/mo)

Edit `vercel.json`:

```json
{ "path": "/api/cron/reminders", "schedule": "*/5 * * * *" }
```

Push, Vercel redeploys with 5-minute cron.

## Option B — Free external cron (recommended for most users)

Use <https://cron-job.org> or any similar free scheduler.

1. Create an account at cron-job.org.
2. New cronjob:
   - **URL**: `https://<your-app>.vercel.app/api/cron/reminders`
   - **Schedule**: every 5 minutes
   - **Request method**: `GET`
   - **Advanced → Headers**: add
     - Header name: `Authorization`
     - Header value: `Bearer <your CRON_SECRET value>`
3. Save and enable.

The handler reads `Authorization: Bearer $CRON_SECRET` and rejects anything
else with 401, so the endpoint stays protected.

## Why the handler is already idempotent

`reminder_log` has a unique index on `(task_id, kind)`. Even if two cron
runs fire simultaneously (e.g. Vercel's daily run and your cron-job.org
every-5-min run), each reminder is sent at most once per task per kind.
Running both schedules in parallel is safe.
