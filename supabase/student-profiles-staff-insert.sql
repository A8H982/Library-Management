-- Staff can INSERT into student_profiles (needed when staff creates a student via client signUp and upserts a row).
-- Run if you already have policies but staff insert is missing.

drop policy if exists "student_profiles_staff_insert" on public.student_profiles;

create policy "student_profiles_staff_insert" on public.student_profiles for insert to authenticated
with check (
  lower(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff')) = 'staff'
);

notify pgrst, 'reload schema';
