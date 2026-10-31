-- CampusFlow schema. Run this once in Supabase SQL editor.
-- Uses the next-auth schema (created by @auth/supabase-adapter the first time
-- auth.js runs its migration) plus our app tables with per-user RLS.

create extension if not exists "pgcrypto";

-- The Auth.js Supabase adapter manages `next_auth.users / accounts / sessions /
-- verification_tokens` for us. Our tables live in `public`, scoped by user_id.

create table if not exists public.user_profiles (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  role text not null default '' check (role in ('', 'student', 'teacher', 'professional')),
  display_name text not null default '',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  pomodoro_work_minutes int not null default 25 check (pomodoro_work_minutes between 1 and 180),
  pomodoro_break_minutes int not null default 5 check (pomodoro_break_minutes between 1 and 60),
  reminder_default_day_before boolean not null default true,
  reminder_default_hour_before boolean not null default true,
  reminder_default_at_time boolean not null default true,
  google_calendar_enabled boolean not null default false,
  google_refresh_token text,
  current_semester_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete cascade,
  name text not null,
  color text not null default 'indigo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subjects_user_idx on public.subjects(user_id);
create index if not exists subjects_semester_idx on public.subjects(semester_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  tag text not null default '',
  due_at timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order int not null default 0,
  reminder_day_before boolean not null default true,
  reminder_hour_before boolean not null default true,
  reminder_at_time boolean not null default true,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_due_idx on public.tasks(user_id, due_at);
create index if not exists tasks_user_completed_idx on public.tasks(user_id, completed);

create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  kind text not null check (kind in ('day_before', 'hour_before', 'at_time')),
  sent_at timestamptz not null default now(),
  unique (task_id, kind)
);

create table if not exists public.timer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  mode text not null check (mode in ('work', 'break')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  seconds int not null check (seconds >= 0)
);
create index if not exists timer_sessions_user_idx on public.timer_sessions(user_id, started_at desc);

-- RLS: deny by default, allow only rows owned by the authed user.
-- Our API routes authenticate the user via NextAuth, then use the SERVICE ROLE
-- key with explicit user_id filters. RLS is still enabled as defense in depth,
-- in case the anon key is ever used from the browser directly.
alter table public.user_profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.reminder_log enable row level security;
alter table public.timer_sessions enable row level security;

do $$ begin
  -- Supabase sets `request.jwt.claims` only when the client uses a JWT. For
  -- next-auth sessions we rely on API-side user_id filtering, but we still
  -- grant row access when the jwt sub matches the user_id column.
  create policy "own profile" on public.user_profiles for all
    using (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''))
    with check (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own semesters" on public.semesters for all
    using (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''))
    with check (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own subjects" on public.subjects for all
    using (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''))
    with check (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own tasks" on public.tasks for all
    using (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''))
    with check (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own reminder_log" on public.reminder_log for all
    using (
      exists (select 1 from public.tasks t
              where t.id = reminder_log.task_id
                and t.user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''))
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own timer_sessions" on public.timer_sessions for all
    using (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''))
    with check (user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), ''));
exception when duplicate_object then null; end $$;

-- Trigger: when a user is created in next_auth.users, insert their profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on next_auth.users;
create trigger on_auth_user_created
  after insert on next_auth.users
  for each row execute function public.handle_new_user();
