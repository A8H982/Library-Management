-- Fix: staff cannot update student_profiles (0 rows updated, or permission errors).
-- Re-applies the staff UPDATE policy and makes app_role checks case-insensitive (Staff vs staff).
-- Safe to run multiple times.
--
-- Run in Supabase → SQL Editor.

drop policy if exists "student_profiles_staff_select" on public.student_profiles;
drop policy if exists "student_profiles_student_select_own" on public.student_profiles;
drop policy if exists "student_profiles_student_insert_own" on public.student_profiles;
drop policy if exists "student_profiles_student_update_own" on public.student_profiles;
drop policy if exists "student_profiles_staff_update" on public.student_profiles;
drop policy if exists "student_profiles_staff_insert" on public.student_profiles;

-- Helper expression: role from JWT user_metadata, default staff for legacy accounts.
-- lower() so "Staff" / "STAFF" still work.

-- Staff: list everyone
create policy "student_profiles_staff_select" on public.student_profiles for select to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
);

-- Student: read own row
create policy "student_profiles_student_select_own" on public.student_profiles for select to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'student'
  and auth.uid() = id
);

-- Student: insert own row
create policy "student_profiles_student_insert_own" on public.student_profiles for insert to authenticated
with check (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'student'
  and auth.uid() = id
);

-- Student: update own row
create policy "student_profiles_student_update_own" on public.student_profiles for update to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'student'
  and auth.uid() = id
)
with check (auth.uid() = id);

-- Staff: update any row (required for the Students page modal)
create policy "student_profiles_staff_update" on public.student_profiles for update to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
)
with check (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
);

-- Staff: insert (Add student via signUp + upsert fallback)
create policy "student_profiles_staff_insert" on public.student_profiles for insert to authenticated
with check (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
);

grant select, insert, update on table public.student_profiles to authenticated;

notify pgrst, 'reload schema';
