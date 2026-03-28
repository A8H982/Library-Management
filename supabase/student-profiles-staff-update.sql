-- Allow library staff to update student_profiles (program, session year, name, etc.)
-- when students have not filled them in or details need correction.
-- Run once in Supabase SQL Editor if you already applied student-profiles.sql without this policy.

drop policy if exists "student_profiles_staff_update" on public.student_profiles;

create policy "student_profiles_staff_update" on public.student_profiles for update to authenticated
using (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
)
with check (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
);

notify pgrst, 'reload schema';
