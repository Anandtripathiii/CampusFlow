-- CampusFlow — role-based schema extension.
-- Paste into Supabase SQL Editor on top of the existing schema.sql.
-- Fully additive: uses IF NOT EXISTS everywhere and never drops existing data.

------------------------------------------------------------------
-- 1) user_profiles: role-specific columns.
------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists institution text not null default '',
  add column if not exists course_or_department text not null default '',
  add column if not exists current_year text not null default '',
  add column if not exists company text not null default '',
  add column if not exists job_title text not null default '',
  add column if not exists team text not null default '',
  add column if not exists goals text[] not null default '{}';

-- Backfill: anyone with a non-empty role from the first version is already onboarded.
update public.user_profiles set onboarding_completed = true
  where role <> '' and onboarding_completed = false;

------------------------------------------------------------------
-- 2) New tables. Scoped by user_id (or teacher/student/owner_user_id)
--    and gated by RLS. All id columns are uuid for consistency.
------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  name text not null,
  section text not null default '',
  subject_id uuid references public.subjects(id) on delete set null,
  student_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists classes_user_idx on public.classes(user_id);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references next_auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  name text not null,
  email text not null default '',
  roll_no text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists students_teacher_idx on public.students(teacher_user_id);
create index if not exists students_class_idx on public.students(class_id);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references next_auth.users(id) on delete cascade,
  student_user_id uuid references next_auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  due_at timestamptz,
  max_marks int,
  status text not null default 'open' check (status in ('open', 'submitted', 'graded', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assignments_owner_idx on public.assignments(owner_user_id);
create index if not exists assignments_student_idx on public.assignments(student_user_id);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_user_id uuid not null references next_auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  marks int,
  feedback text not null default ''
);
create index if not exists submissions_assignment_idx on public.submissions(assignment_id);
create index if not exists submissions_student_idx on public.submissions(student_user_id);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  notes text not null default ''
);
create index if not exists attendance_user_date_idx on public.attendance(user_id, date desc);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  date timestamptz,
  max_marks int,
  score int,
  created_at timestamptz not null default now()
);
create index if not exists exams_user_idx on public.exams(user_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects(user_id);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  attendees text[] not null default '{}',
  notes text not null default ''
);
create index if not exists meetings_user_start_idx on public.meetings(user_id, start_at);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  name text not null,
  email text not null default '',
  role text not null default '',
  workload_pct int not null default 0 check (workload_pct between 0 and 100)
);
create index if not exists team_members_user_idx on public.team_members(user_id);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  scope text not null default 'global' check (scope in ('global', 'semester', 'project', 'class')),
  scope_id uuid,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes(user_id);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references next_auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists announcements_author_idx on public.announcements(author_user_id);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  title text not null,
  target_date date,
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  category text not null default ''
);
create index if not exists goals_user_idx on public.goals(user_id);

------------------------------------------------------------------
-- 3) RLS. Enable on every new table, drop any prior policy by name,
--    then re-create (so this migration is safe to re-run).
------------------------------------------------------------------
alter table public.classes        enable row level security;
alter table public.students       enable row level security;
alter table public.assignments    enable row level security;
alter table public.submissions    enable row level security;
alter table public.attendance     enable row level security;
alter table public.exams          enable row level security;
alter table public.projects       enable row level security;
alter table public.meetings       enable row level security;
alter table public.team_members   enable row level security;
alter table public.notes          enable row level security;
alter table public.announcements  enable row level security;
alter table public.goals          enable row level security;

drop policy if exists "own classes"       on public.classes;
drop policy if exists "own students"      on public.students;
drop policy if exists "own assignments"   on public.assignments;
drop policy if exists "own submissions"   on public.submissions;
drop policy if exists "own attendance"    on public.attendance;
drop policy if exists "own exams"         on public.exams;
drop policy if exists "own projects"      on public.projects;
drop policy if exists "own meetings"      on public.meetings;
drop policy if exists "own team_members"  on public.team_members;
drop policy if exists "own notes"         on public.notes;
drop policy if exists "own announcements" on public.announcements;
drop policy if exists "own goals"         on public.goals;

create policy "own classes" on public.classes for all
  using (user_id = next_auth.uid()) with check (user_id = next_auth.uid());

create policy "own students" on public.students for all
  using (teacher_user_id = next_auth.uid()) with check (teacher_user_id = next_auth.uid());

-- Owner (teacher) or assigned student can see / change their assignment row.
create policy "own assignments" on public.assignments for all
  using (owner_user_id = next_auth.uid() or student_user_id = next_auth.uid())
  with check (owner_user_id = next_auth.uid() or student_user_id = next_auth.uid());

-- Student sees their own submission; teacher sees submissions for assignments they own.
create policy "own submissions" on public.submissions for all
  using (
    student_user_id = next_auth.uid()
    or exists (select 1 from public.assignments a
               where a.id = submissions.assignment_id and a.owner_user_id = next_auth.uid())
  )
  with check (
    student_user_id = next_auth.uid()
    or exists (select 1 from public.assignments a
               where a.id = submissions.assignment_id and a.owner_user_id = next_auth.uid())
  );

create policy "own attendance" on public.attendance for all
  using (user_id = next_auth.uid()) with check (user_id = next_auth.uid());

create policy "own exams" on public.exams for all
  using (user_id = next_auth.uid()) with check (user_id = next_auth.uid());

create policy "own projects" on public.projects for all
  using (user_id = next_auth.uid()) with check (user_id = next_auth.uid());

create policy "own meetings" on public.meetings for all
  using (user_id = next_auth.uid()) with check (user_id = next_auth.uid());

create policy "own team_members" on public.team_members for all
  using (user_id = next_auth.uid()) with check (user_id = next_auth.uid());

create policy "own notes" on public.notes for all
  using (user_id = next_auth.uid()) with check (user_id = next_auth.uid());

create policy "own announcements" on public.announcements for all
  using (author_user_id = next_auth.uid()) with check (author_user_id = next_auth.uid());

create policy "own goals" on public.goals for all
  using (user_id = next_auth.uid()) with check (user_id = next_auth.uid());
