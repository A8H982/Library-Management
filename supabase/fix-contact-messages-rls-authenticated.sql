-- Fix: contact form inserts fail when the user is signed in (JWT role = authenticated, not anon).
-- Run in Supabase SQL Editor once. Safe to re-run.

grant insert on table public.contact_messages to authenticated;

drop policy if exists "contact_messages_anon_insert" on public.contact_messages;
drop policy if exists "contact_messages_insert" on public.contact_messages;

create policy "contact_messages_insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

notify pgrst, 'reload schema';
