-- Fix: "new row violates row-level security policy for table books" while signed in.
--
-- Signed-in browsers send a JWT whose role is `authenticated`, not `anon`.
-- RLS must allow INSERT/UPDATE/DELETE for `authenticated`, and that role needs
-- privileges on public.books.
--
-- Run this in Supabase Dashboard → SQL Editor → New query → Run (same project as js/supabase-config.js).
-- Then wait ~30s or refresh the catalog page.
--
-- Optional: verify policies after running:
--   select policyname, roles, cmd, qual, with_check
--   from pg_policies where schemaname = 'public' and tablename = 'books';

alter table public.books enable row level security;

-- Table privileges (re-applies if someone revoked them)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.books to anon, authenticated;

drop policy if exists "books_auth_select" on public.books;
drop policy if exists "books_auth_insert" on public.books;
drop policy if exists "books_auth_update" on public.books;
drop policy if exists "books_auth_delete" on public.books;

create policy "books_auth_select" on public.books for select to authenticated using (true);
create policy "books_auth_insert" on public.books for insert to authenticated with check (true);
create policy "books_auth_update" on public.books for update to authenticated using (true) with check (true);
create policy "books_auth_delete" on public.books for delete to authenticated using (true);

notify pgrst, 'reload schema';
