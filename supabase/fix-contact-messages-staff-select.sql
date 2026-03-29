-- Staff inbox: fix empty list when rows exist in public.contact_messages.
-- Causes: (1) auth.jwt() user_metadata can differ from session.user; (2) RLS used
--   lower(...) = 'staff' while the app treats any non-student role as staff (see js/auth-app-role.js).
-- Run once in Supabase SQL Editor after contact_messages exists. Safe to re-run.

grant select on table public.contact_messages to authenticated;

-- Match js/auth-app-role.js: only explicit "student" blocks staff; missing/unknown → staff.
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
