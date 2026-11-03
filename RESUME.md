# RESUME — CampusFlow autonomous build

**Last commit pushed (before this file):** `7bbd916` — `feat(team_members): CRUD`

Checkpoint reason: Claude Code usage-limit allowance ran out mid-batch. Build is green at the checkpoint commit, lint passes, no half-written files on disk.

## Where I stopped

Mid-way through **Phase 7 of the autonomous brief** — the one-commit-per-entity CRUD API batch. 7 of 12 entity CRUD commits are in:

| # | Entity | Status | Commit |
|---|---|---|---|
| 1 | classes | done | `ade0b9d` |
| 2 | students | done | `50902de` |
| 3 | attendance | done | `1aa4a0c` |
| 4 | assignments | done | `6186884` |
| 5 | submissions | done | `63fcd8c` |
| 6 | exams | done | `b09cc1b` |
| 7 | projects | done | `fb36910` |
| 8 | meetings | done | `e6bb346` |
| 9 | team_members | done | `7bbd916` |
| 10 | **notes** | TODO | — |
| 11 | **announcements** | TODO | — |
| 12 | **goals** | TODO | — |

## Next 3 concrete steps to resume

### 1. Finish the last 3 entity CRUD commits (same pattern as #1-9)

For each entity below, create two files that use the shared factories in `src/lib/crud.ts` and the Zod schemas already in `src/lib/zod.ts` (the schemas were added in commit `ade0b9d` — don't re-add them). Then commit per entity.

```
src/app/api/notes/route.ts
src/app/api/notes/[id]/route.ts
src/app/api/announcements/route.ts
src/app/api/announcements/[id]/route.ts
src/app/api/goals/route.ts
src/app/api/goals/[id]/route.ts
```

Shape — copy `src/app/api/projects/route.ts` and rename. Owner columns:

- **notes**:         `["user_id"]`,         insertCol `"user_id"`,         Zod `NoteInput` / `NotePatch`,         order by `updated_at` desc
- **announcements**: `["author_user_id"]`,  insertCol `"author_user_id"`,  Zod `AnnouncementInput` / `AnnouncementPatch`, order by `created_at` desc
- **goals**:         `["user_id"]`,         insertCol `"user_id"`,         Zod `GoalInput` / `GoalPatch`,         order by `target_date`

Then commit each as `feat(notes): CRUD`, `feat(announcements): CRUD`, `feat(goals): CRUD` using the same message style as prior commits.

### 2. Phase 9 tests — Vitest + Playwright scaffold

Not started.

```
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

Add scripts to `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

Realistic initial coverage (what can actually pass without a running server + real auth):
- `tests/unit/zod.test.ts` — parse valid / invalid payloads against every exported schema in `src/lib/zod.ts`.
- `tests/unit/greeting.test.ts` — mock `Date` and assert `greeting()` returns the right time-of-day string.
- `tests/e2e/smoke.spec.ts` — `page.goto('/')`, expect 302/redirect to `/signin`. Nothing authenticated — stub out or skip auth-gated flows with a `test.skip` + comment.

Most Phase 9 scenarios (role dashboard renders, task CRUD, cross-tab writes, etc.) require a running Supabase + mock session; they can only be meaningfully tested once a fixture user is seeded. **Flag this to the user** rather than writing fake tests.

### 3. Push the three CRUD commits and the test scaffold

After each `feat(X): CRUD` commit, verify `npm run build` and `npm run lint` both pass (they will — the pattern is identical to the 9 already-landed entities), then `git push origin main`.

## Manual steps the user still needs to run

1. **Apply the Supabase migrations.** This checkpoint has NOT run them against the user's real DB — no local service-role key available on this machine.

   ```bash
   # one-shot, from campusflow-app/:
   export POSTGRES_URL="postgres://..."   # from Supabase → Settings → Database → Connection string (direct)
   npm run migrate
   ```

   This applies `supabase/migrations/001_role_based.sql` (role-specific profile columns + 12 new tables + RLS) and `002_legacy_backup.sql` (jsonb snapshot of current semesters/subjects/tasks).

2. **Vercel will auto-deploy from `main`.** No action needed beyond that.

## Open items from the Phase 1-10 brief that are still untouched

- **Phase 4 shared features** — profile page redesign, global search, calendar view, notes/goals UI, data export/import, keyboard shortcuts, toast manager.
- **Phase 5** — warm editorial palette (`#FAF8F3`, Inter/Geist, no gradients). Current theme kept.
- **Phase 6** — responsive audit at 320/375/390/768/1024/1440; a11y audit (skip link, focus trap, aria-live).
- **Phase 7** — storage reliability (Web Locks multi-tab, failed-save protection, corrupted-JSON recovery).
- **Phase 8** — split large Dashboard.tsx (525 lines) further; the three role wrappers under `src/components/dashboards/` are near-identity renders of it.
- **UI pages for the 12 new entities** — brief asked for both API routes and UI pages. Only API routes are being delivered this pass. Sidebar entries not yet wired.

## Failing tests / lint errors left open

None. `npm run lint` is clean, `npm run build` is green, `npm run typecheck` is clean at the checkpoint commit.
