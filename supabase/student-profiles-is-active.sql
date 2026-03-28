-- Soft-delete flag: staff "removes" a student from the directory without deleting the auth user.
-- Run once in Supabase SQL Editor if student_profiles already exists without is_active.

alter table public.student_profiles
  add column if not exists is_active boolean not null default true;

update public.student_profiles set is_active = true where is_active is null;

notify pgrst, 'reload schema';
