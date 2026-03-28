-- Contact form messages (contact.html). Run in Supabase SQL Editor.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz default now()
);

alter table public.contact_messages enable row level security;

grant usage on schema public to anon;
grant insert on table public.contact_messages to anon;

drop policy if exists "contact_messages_anon_insert" on public.contact_messages;

create policy "contact_messages_anon_insert"
  on public.contact_messages for insert to anon
  with check (true);

notify pgrst, 'reload schema';
