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

grant usage on schema public to anon, authenticated;
grant insert on table public.contact_messages to anon, authenticated;
grant select on table public.contact_messages to authenticated;

-- Anonymous (guest) and signed-in users both submit the public contact form.
drop policy if exists "contact_messages_anon_insert" on public.contact_messages;
drop policy if exists "contact_messages_insert" on public.contact_messages;

create policy "contact_messages_insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- Staff read inbox: role from auth.users (same source as the browser session); non-student = staff (see js/auth-app-role.js)
create or replace function public.gj_is_staff_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select lower(coalesce(nullif(trim(u.raw_user_meta_data->>'app_role'), ''), 'staff')) != 'student'
      from auth.users u
      where u.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.gj_is_staff_user() from public;
grant execute on function public.gj_is_staff_user() to authenticated;

drop policy if exists "contact_messages_staff_select" on public.contact_messages;

create policy "contact_messages_staff_select"
  on public.contact_messages for select to authenticated
  using ( public.gj_is_staff_user() );

notify pgrst, 'reload schema';
