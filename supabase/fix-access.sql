-- RightAware access fix — run ONCE in Supabase SQL editor AFTER the schema.
-- Fixes: (1) missing table privileges (policies alone are not enough; without
-- GRANTs every API call fails 42501 permission denied); (2) RLS helper
-- functions must bypass RLS via SECURITY DEFINER, otherwise policies that call
-- them while they read user_roles recurse infinitely and every query errors.
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert on public.contact_messages to anon;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
create or replace function ra_is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') $$;
create or replace function ra_has_role(r text) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = r) $$;
