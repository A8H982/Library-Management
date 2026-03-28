-- Registered students: one row per auth user with app_role = student (linked by id = auth.users.id).
-- Students edit their own program & admission year (session is derived in the app).
-- Staff can read all rows for the directory.
--
-- Run in Supabase SQL Editor after rls-staff-student-roles.sql (or any base setup).
--
-- If student accounts already existed before this script, also run student-profiles-backfill.sql
-- once so those users get a row (the auth trigger only runs for new signups).

create table if not exists public.student_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  program text,
  year int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_profiles_email_idx on public.student_profiles (email);

alter table public.student_profiles enable row level security;

grant select, insert, update on table public.student_profiles to authenticated;

drop policy if exists "student_profiles_staff_select" on public.student_profiles;
drop policy if exists "student_profiles_student_select_own" on public.student_profiles;
drop policy if exists "student_profiles_student_insert_own" on public.student_profiles;
drop policy if exists "student_profiles_student_update_own" on public.student_profiles;
drop policy if exists "student_profiles_staff_insert" on public.student_profiles;

-- Staff: list everyone (for the staff Students page). lower() so app_role casing matches JWT.
create policy "student_profiles_staff_select" on public.student_profiles for select to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
);

-- Student: read own row.
create policy "student_profiles_student_select_own" on public.student_profiles for select to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'student'
  and auth.uid() = id
);

-- Student: insert own row (first save or if trigger did not run).
create policy "student_profiles_student_insert_own" on public.student_profiles for insert to authenticated
with check (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'student'
  and auth.uid() = id
);

-- Student: update own row.
create policy "student_profiles_student_update_own" on public.student_profiles for update to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'student'
  and auth.uid() = id
)
with check (auth.uid() = id);

-- Staff: update any row (add or fix program / year / name for students who skipped optional fields).
drop policy if exists "student_profiles_staff_update" on public.student_profiles;
create policy "student_profiles_staff_update" on public.student_profiles for update to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
)
with check (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
);

-- Staff: insert row (e.g. after staff uses client signUp to create a student if trigger did not run).
create policy "student_profiles_staff_insert" on public.student_profiles for insert to authenticated
with check (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
);

create or replace function public.set_student_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_profiles_updated_at on public.student_profiles;
create trigger student_profiles_updated_at
  before update on public.student_profiles
  for each row execute procedure public.set_student_profiles_updated_at();

-- Auto-create a directory row when someone signs up as a student (optional; first profile save also works).
create or replace function public.handle_new_user_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'app_role', '') = 'student' then
    insert into public.student_profiles (id, email, full_name)
    values (
      new.id,
      new.email,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), '')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_student_profile on auth.users;
create trigger on_auth_user_created_student_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_student_profile();

notify pgrst, 'reload schema';
