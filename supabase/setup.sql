-- GJ Library — full setup: table `books`, sample rows, Storage bucket `book-covers`.
--
-- HOW TO FIX "Could not find the table 'public.books' in the schema cache":
--   1. Open https://supabase.com/dashboard → your project → SQL Editor.
--   2. Paste this entire file (or start with create-books-only.sql if Storage fails).
--   3. Click Run. You should see "Success".
--   4. Wait ~30–60s, or the NOTIFY at the end forces API reload. Refresh your site.
--   5. Confirm Project Settings → API → URL matches js/supabase-config.js.
--
-- If `books` exists but the app still errors: Table Editor → check `books` is under schema `public`.

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

alter table public.books add column if not exists cover_image_path text;

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

-- Signed-in staff use role `authenticated` (JWT), not `anon`. Without these, INSERT/UPDATE fail from catalog.html.
drop policy if exists "books_auth_select" on public.books;
drop policy if exists "books_auth_insert" on public.books;
drop policy if exists "books_auth_update" on public.books;
drop policy if exists "books_auth_delete" on public.books;

create policy "books_auth_select" on public.books for select to authenticated using (true);
create policy "books_auth_insert" on public.books for insert to authenticated with check (true);
create policy "books_auth_update" on public.books for update to authenticated using (true) with check (true);
create policy "books_auth_delete" on public.books for delete to authenticated using (true);

insert into public.books (accession_code, title, author, isbn, shelf_location, publication_year, status) values
  ('BK-24001', 'Introduction to Algorithms', 'Cormen et al.', '978-0262033848', 'Stack A-12', 2009, 'available'),
  ('BK-24002', 'A Suitable Boy', 'Vikram Seth', '978-0060786526', 'Fiction B-03', 1993, 'on_loan'),
  ('BK-24003', 'Patna Blues', 'Abdullah Khan', '978-9386797278', 'Regional C-01', 2018, 'available'),
  ('BK-24004', 'The Discovery of India', 'Jawaharlal Nehru', '978-0143031031', 'History D-07', 1946, 'reference')
on conflict (accession_code) do nothing;

-- Book cover images (Storage). Safe to re-run.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-covers',
  'book-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "book_covers_public_select" on storage.objects;
drop policy if exists "book_covers_auth_insert" on storage.objects;
drop policy if exists "book_covers_auth_update" on storage.objects;
drop policy if exists "book_covers_auth_delete" on storage.objects;

create policy "book_covers_public_select"
on storage.objects for select
using (bucket_id = 'book-covers');

create policy "book_covers_auth_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'book-covers');

create policy "book_covers_auth_update"
on storage.objects for update to authenticated
using (bucket_id = 'book-covers')
with check (bucket_id = 'book-covers');

create policy "book_covers_auth_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'book-covers');

notify pgrst, 'reload schema';
