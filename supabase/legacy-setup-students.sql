-- Legacy: students table from the old college demo (not used by library catalog).
-- Kept only if you still need public.students for other tools.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text unique not null,
  full_name text not null,
  program text not null,
  year int,
  status text not null check (status in ('active', 'probation', 'graduate', 'inactive')),
  created_at timestamptz default now()
);

alter table public.students enable row level security;

drop policy if exists "students_anon_select" on public.students;
drop policy if exists "students_anon_insert" on public.students;
drop policy if exists "students_anon_update" on public.students;
drop policy if exists "students_anon_delete" on public.students;

create policy "students_anon_select" on public.students for select to anon using (true);
create policy "students_anon_insert" on public.students for insert to anon with check (true);
create policy "students_anon_update" on public.students for update to anon using (true) with check (true);
create policy "students_anon_delete" on public.students for delete to anon using (true);
