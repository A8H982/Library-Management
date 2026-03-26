-- Minimal: create public.books + RLS only (no Storage).
-- Run this in Supabase → SQL Editor → New query → Run.
-- If you still see "schema cache" errors, wait ~1 minute or run: NOTIFY pgrst, 'reload schema';

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  accession_code text unique not null,
  title text not null,
  author text not null,
  isbn text,
  shelf_location text,
  publication_year int,
  cover_image_path text,
  status text not null default 'available' check (status in ('available', 'on_loan', 'reference', 'lost', 'repair')),
  created_at timestamptz default now()
);

alter table public.books enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.books to anon, authenticated;

drop policy if exists "books_anon_select" on public.books;
drop policy if exists "books_anon_insert" on public.books;
drop policy if exists "books_anon_update" on public.books;
drop policy if exists "books_anon_delete" on public.books;

create policy "books_anon_select" on public.books for select to anon using (true);
create policy "books_anon_insert" on public.books for insert to anon with check (true);
create policy "books_anon_update" on public.books for update to anon using (true) with check (true);
create policy "books_anon_delete" on public.books for delete to anon using (true);

-- Staff signed in via Supabase Auth use `authenticated`, not `anon`.
drop policy if exists "books_auth_select" on public.books;
drop policy if exists "books_auth_insert" on public.books;
drop policy if exists "books_auth_update" on public.books;
drop policy if exists "books_auth_delete" on public.books;

create policy "books_auth_select" on public.books for select to authenticated using (true);
create policy "books_auth_insert" on public.books for insert to authenticated with check (true);
create policy "books_auth_update" on public.books for update to authenticated using (true) with check (true);
create policy "books_auth_delete" on public.books for delete to authenticated using (true);

-- Tell PostgREST to pick up the new table (Supabase API).
notify pgrst, 'reload schema';
