-- CampusFlow — full schema (Auth.js next_auth + app tables).
-- Paste this ENTIRE file into Supabase → SQL Editor → New query → Run.
-- Idempotent: safe to re-run.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

------------------------------------------------------------------
-- 1) Auth.js (NextAuth v5) Supabase adapter schema: next_auth.*
--    Source: https://authjs.dev/getting-started/adapters/supabase
------------------------------------------------------------------
create schema if not exists next_auth;
grant usage on schema next_auth to service_role;
grant all on schema next_auth to postgres;

-- next_auth.uid() returns the current user's id from the JWT.
create or replace function next_auth.uid() returns uuid
  language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create table if not exists next_auth.users (
  id            uuid primary key default uuid_generate_v4(),
  name          text,
  email         text,
  "emailVerified" timestamptz,
  image         text,
  constraint users_email_unique unique (email)
);
grant all on table next_auth.users to postgres, service_role;

create table if not exists next_auth.sessions (
  id             uuid primary key default uuid_generate_v4(),
  expires        timestamptz not null,
  "sessionToken" text not null,
  "userId"       uuid references next_auth.users(id) on delete cascade,
  constraint sessions_token_unique unique ("sessionToken")
);
grant all on table next_auth.sessions to postgres, service_role;

create table if not exists next_auth.accounts (
  id                   uuid primary key default uuid_generate_v4(),
  type                 text not null,
  provider             text not null,
  "providerAccountId"  text not null,
  refresh_token        text,
  access_token         text,
  expires_at           bigint,
  token_type           text,
  scope                text,
  id_token             text,
  session_state        text,
  oauth_token_secret   text,
  oauth_token          text,
  "userId"             uuid references next_auth.users(id) on delete cascade,
  constraint accounts_provider_unique unique (provider, "providerAccountId")
);
grant all on table next_auth.accounts to postgres, service_role;

create table if not exists next_auth.verification_tokens (
  identifier text,
  token      text,
  expires    timestamptz not null,
  constraint verification_tokens_pkey primary key (token),
  constraint verification_tokens_token_identifier_unique unique (token, identifier)
);
grant all on table next_auth.verification_tokens to postgres, service_role;

------------------------------------------------------------------
-- 2) App tables (public.*) scoped by user_id, with RLS.
------------------------------------------------------------------
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

------------------------------------------------------------------
-- 3) Row Level Security. API routes authenticate via NextAuth and
--    use the SERVICE ROLE key with user_id filters; RLS is defense
--    in depth for any direct client use.
------------------------------------------------------------------
alter table public.user_profiles  enable row level security;
alter table public.semesters      enable row level security;
alter table public.subjects       enable row level security;
alter table public.tasks          enable row level security;
alter table public.reminder_log   enable row level security;
alter table public.timer_sessions enable row level security;

do $$ begin
  create policy "own profile" on public.user_profiles for all
    using (user_id = next_auth.uid())
    with check (user_id = next_auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own semesters" on public.semesters for all
    using (user_id = next_auth.uid())
    with check (user_id = next_auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own subjects" on public.subjects for all
    using (user_id = next_auth.uid())
    with check (user_id = next_auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own tasks" on public.tasks for all
    using (user_id = next_auth.uid())
    with check (user_id = next_auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own reminder_log" on public.reminder_log for all
    using (exists (
      select 1 from public.tasks t
      where t.id = reminder_log.task_id and t.user_id = next_auth.uid()
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own timer_sessions" on public.timer_sessions for all
    using (user_id = next_auth.uid())
    with check (user_id = next_auth.uid());
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- 4) Trigger: provision a user_profiles row for every new auth user.
------------------------------------------------------------------
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
