-- Optional: the Students page now uses select('*') and maps id/name/email in JS, so you
-- may not need this script just to view data. Use it if you want real DB columns for
-- student_id, full_name, program, year, status (e.g. for inserts/exports from SQL).
--
-- For tables that only have: id, name, email — keeps those; adds the extra columns.
-- Run: Supabase → SQL Editor → Run.

alter table public.students
  add column if not exists student_id text,
  add column if not exists full_name text,
  add column if not exists program text,
  add column if not exists year int,
  add column if not exists status text;

-- full_name for the UI: use name, else email, else placeholder (keeps your id, name, email columns)
update public.students
set full_name = coalesce(
  nullif(trim(full_name), ''),
  nullif(trim(name), ''),
  nullif(trim(email), ''),
  'Student'
);

-- Display student_id derived from internal id
update public.students
set student_id = 'STU-' || replace(id::text, '-', '')
where student_id is null or trim(student_id) = '';

update public.students set program = coalesce(nullif(trim(program), ''), 'Undeclared')
where program is null or trim(program) = '';

update public.students set status = lower(coalesce(nullif(trim(status), ''), 'active'))
where status is null or trim(status) = '';

update public.students set status = 'active'
where status not in ('active', 'probation', 'graduate', 'inactive');

create unique index if not exists students_student_id_unique on public.students (student_id);

alter table public.students enable row level security;

drop policy if exists "students_anon_select" on public.students;
drop policy if exists "students_anon_insert" on public.students;
drop policy if exists "students_anon_update" on public.students;
drop policy if exists "students_anon_delete" on public.students;

create policy "students_anon_select" on public.students for select to anon using (true);
create policy "students_anon_insert" on public.students for insert to anon with check (true);
create policy "students_anon_update" on public.students for update to anon using (true) with check (true);
create policy "students_anon_delete" on public.students for delete to anon using (true);
