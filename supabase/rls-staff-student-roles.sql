-- Staff vs student roles (JWT user_metadata.app_role).
-- Student accounts cannot INSERT/UPDATE/DELETE books or students; staff can (including legacy users with no app_role).
--
-- Run in Supabase SQL Editor after setup.sql / fix-books-rls-authenticated.sql.
-- Registration codes only affect client UX; RLS enforces writes using the role stored in the JWT.

-- ----- Books: tighten writes to staff (missing app_role counts as staff for backwards compatibility)
drop policy if exists "books_auth_insert" on public.books;
drop policy if exists "books_auth_update" on public.books;
drop policy if exists "books_auth_delete" on public.books;

create policy "books_auth_insert" on public.books for insert to authenticated
with check (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
);

create policy "books_auth_update" on public.books for update to authenticated
using (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
)
with check (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
);

create policy "books_auth_delete" on public.books for delete to authenticated
using (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
);

-- ----- Students directory (optional table): staff-only for authenticated; anon has no access
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text unique not null,
  full_name text not null,
  program text not null,
  year int,
  status text not null default 'active' check (status in ('active', 'probation', 'graduate', 'inactive')),
  created_at timestamptz default now()
);

alter table public.students enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.students to authenticated;

drop policy if exists "students_anon_select" on public.students;
drop policy if exists "students_anon_insert" on public.students;
drop policy if exists "students_anon_update" on public.students;
drop policy if exists "students_anon_delete" on public.students;
drop policy if exists "students_auth_select" on public.students;
drop policy if exists "students_auth_insert" on public.students;
drop policy if exists "students_auth_update" on public.students;
drop policy if exists "students_auth_delete" on public.students;
drop policy if exists "students_staff_select" on public.students;
drop policy if exists "students_staff_insert" on public.students;
drop policy if exists "students_staff_update" on public.students;
drop policy if exists "students_staff_delete" on public.students;

create policy "students_staff_select" on public.students for select to authenticated
using (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
);

create policy "students_staff_insert" on public.students for insert to authenticated
with check (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
);

create policy "students_staff_update" on public.students for update to authenticated
using (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
)
with check (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
);

create policy "students_staff_delete" on public.students for delete to authenticated
using (
  coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'app_role'), ''), 'staff') = 'staff'
);

notify pgrst, 'reload schema';
