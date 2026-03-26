-- Optional: `authenticated` policies are now included in supabase/setup.sql and create-books-only.sql.
-- Run this file only if you created `books` before that change and still lack staff policies.
--
-- After enabling Supabase Auth, signed-in browser requests use the `authenticated` role (not `anon`).
-- Run supabase/setup.sql first so `public.books` exists.

-- Library catalog (catalog.html + js/books.js)
drop policy if exists "books_auth_select" on public.books;
drop policy if exists "books_auth_insert" on public.books;
drop policy if exists "books_auth_update" on public.books;
drop policy if exists "books_auth_delete" on public.books;

create policy "books_auth_select" on public.books for select to authenticated using (true);
create policy "books_auth_insert" on public.books for insert to authenticated with check (true);
create policy "books_auth_update" on public.books for update to authenticated using (true) with check (true);
create policy "books_auth_delete" on public.books for delete to authenticated using (true);

-- Optional: remove or tighten `anon` policies in setup.sql if ONLY logged-in staff should access data.
