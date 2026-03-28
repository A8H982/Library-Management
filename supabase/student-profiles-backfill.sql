-- One-time backfill: add a student_profiles row for every existing auth user
-- who registered as a student (app_role in user metadata) but has no row yet.
-- This fixes accounts created before student-profiles.sql or when the auth trigger did not run.
--
-- Run in Supabase SQL Editor (same project as your app).

insert into public.student_profiles (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), '')
from auth.users u
where coalesce(u.raw_user_meta_data ->> 'app_role', '') = 'student'
on conflict (id) do nothing;

notify pgrst, 'reload schema';
