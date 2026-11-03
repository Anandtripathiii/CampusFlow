-- CampusFlow — legacy_backup table.
-- Snapshots every row currently in semesters, subjects and tasks so a
-- later destructive migration can be unwound. Pure JSONB copies —
-- keeps the exact row shape without caring about column drift.

create table if not exists public.legacy_backup (
  id          uuid primary key default gen_random_uuid(),
  source      text not null check (source in ('semesters', 'subjects', 'tasks')),
  source_id   uuid not null,
  user_id     uuid not null references next_auth.users(id) on delete cascade,
  snapshot    jsonb not null,
  taken_at    timestamptz not null default now(),
  unique (source, source_id, taken_at)
);
create index if not exists legacy_backup_user_idx on public.legacy_backup(user_id);

alter table public.legacy_backup enable row level security;
drop policy if exists "own legacy_backup" on public.legacy_backup;
create policy "own legacy_backup" on public.legacy_backup for select
  using (user_id = next_auth.uid());

insert into public.legacy_backup (source, source_id, user_id, snapshot)
select 'semesters', id, user_id, to_jsonb(s) from public.semesters s
on conflict do nothing;

insert into public.legacy_backup (source, source_id, user_id, snapshot)
select 'subjects', id, user_id, to_jsonb(s) from public.subjects s
on conflict do nothing;

insert into public.legacy_backup (source, source_id, user_id, snapshot)
select 'tasks', id, user_id, to_jsonb(t) from public.tasks t
on conflict do nothing;
