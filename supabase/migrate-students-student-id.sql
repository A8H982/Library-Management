-- Align public.students with the Students page (student_id, full_name, program, year, status).
-- Fixes PostgREST errors like: column "student_id" does not exist, or Could not find the 'full_name' column ... schema cache.
-- Run once in Supabase → SQL Editor. Safe to re-run (IF NOT EXISTS / idempotent updates).

alter table public.students
  add column if not exists student_id text,
  add column if not exists full_name text,
  add column if not exists program text,
  add column if not exists year int,
  add column if not exists status text,
  add column if not exists created_at timestamptz default now();

-- Backfill student_id from row id (uuid)
update public.students
set student_id = 'STU-' || replace(id::text, '-', '')
where student_id is null or trim(student_id) = '';

-- Backfill full_name from legacy name/email only if those columns exist
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'name'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'email'
  ) then
    execute $u$
      update public.students set full_name = coalesce(
        nullif(trim(full_name), ''),
        nullif(trim(name), ''),
        nullif(trim(email), ''),
        'Student'
      ) where full_name is null or trim(full_name) = ''
    $u$;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'name'
  ) then
    execute $u$
      update public.students set full_name = coalesce(
        nullif(trim(full_name), ''),
        nullif(trim(name), ''),
        'Student'
      ) where full_name is null or trim(full_name) = ''
    $u$;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'email'
  ) then
    execute $u$
      update public.students set full_name = coalesce(
        nullif(trim(full_name), ''),
        nullif(trim(email), ''),
        'Student'
      ) where full_name is null or trim(full_name) = ''
    $u$;
  else
    update public.students set full_name = coalesce(nullif(trim(full_name), ''), 'Student')
    where full_name is null or trim(full_name) = '';
  end if;
end $$;

update public.students
set program = coalesce(nullif(trim(program), ''), 'Undeclared')
where program is null or trim(program) = '';

update public.students
set status = lower(coalesce(nullif(trim(status), ''), 'active'))
where status is null or trim(status) = '';

update public.students set status = 'active'
where status not in ('active', 'probation', 'graduate', 'inactive');

create unique index if not exists students_student_id_unique on public.students (student_id);

-- Enforce NOT NULL only when every row has student_id (fresh installs / after backfill)
do $$
begin
  if not exists (select 1 from public.students where student_id is null) then
    alter table public.students alter column student_id set not null;
  end if;
exception
  when others then null;
end $$;

notify pgrst, 'reload schema';
