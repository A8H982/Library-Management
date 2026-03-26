-- Book cover images: Storage bucket + optional column migration.
-- Run after setup.sql if you already created `books` without covers.

alter table public.books add column if not exists cover_image_path text;

-- Public bucket so cover URLs work on the home page without signing URLs.
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

-- Anyone can view cover images (bucket is public).
create policy "book_covers_public_select"
on storage.objects for select
using (bucket_id = 'book-covers');

-- Signed-in staff (Supabase Auth) can manage files in this bucket.
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

-- Dev parity: if you use anon policies on `books`, uncomment these for the same session (not recommended for production).
-- create policy "book_covers_anon_insert" on storage.objects for insert to anon with check (bucket_id = 'book-covers');
-- create policy "book_covers_anon_update" on storage.objects for update to anon using (bucket_id = 'book-covers') with check (bucket_id = 'book-covers');
-- create policy "book_covers_anon_delete" on storage.objects for delete to anon using (bucket_id = 'book-covers');
