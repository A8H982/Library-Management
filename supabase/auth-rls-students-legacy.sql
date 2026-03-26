-- Optional: only if you still use public.students (legacy college demo).
-- Requires public.students from supabase/legacy-setup-students.sql

drop policy if exists "students_auth_select" on public.students;
drop policy if exists "students_auth_insert" on public.students;
drop policy if exists "students_auth_update" on public.students;
drop policy if exists "students_auth_delete" on public.students;

create policy "students_auth_select" on public.students for select to authenticated using (true);
create policy "students_auth_insert" on public.students for insert to authenticated with check (true);
create policy "students_auth_update" on public.students for update to authenticated using (true) with check (true);
create policy "students_auth_delete" on public.students for delete to authenticated using (true);
