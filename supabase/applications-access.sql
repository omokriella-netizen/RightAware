-- RightAware — applications & RBAC add-on (OPTIONAL, additive).
-- Run ONCE in the Supabase SQL editor (SQL > New query > paste > Run).
-- Safe to re-run (every statement uses drop-if-exists / create or replace).
--
-- WHAT THIS IS / IS NOT
--  * It does NOT re-run the schema, does NOT alter any table, and does NOT
--    touch existing data. It only adds row-level-security POLICIES and two
--    helper functions that the schema intentionally left for this stage.
--  * Without it, the site still works: signup applications fall back to the
--    contact-message queue (see signup.html). With it, applications are stored
--    directly and administrators can approve them.
--
-- WHAT IT FIXES
--  1) professionals had NO write policy at all — nobody (not even admins)
--     could insert or approve professional rows through the API.
--  2) organisations only allowed editors/admins to write — applicants could
--     not submit; pending rows are still hidden from the public
--     (pub_read_orgs / pub_read_profs already restrict public SELECT to
--     verification_status='verified').
--  3) applicants could not read back their own pending application
--     (needed for the "my application status" panel).
--  4) non-admin users could not resolve their own roles (user_roles had only
--     an admin-read policy), so role-aware dashboards only worked for admins.
--  5) admins could SELECT contact_messages but not UPDATE them, so the inbox
--     "Mark reviewed" button silently changed 0 rows (admin_msg_update below).

-- ---------------------------------------------------------------------------
-- 1. Professionals: applicant insert + own-row read, admin/editor approval
-- ---------------------------------------------------------------------------
drop policy if exists edit_profs on public.professionals;
create policy edit_profs on public.professionals
  for all to authenticated
  using (ra_has_role('editor') or ra_is_admin())
  with check (ra_has_role('editor') or ra_is_admin());

drop policy if exists apply_profs on public.professionals;
create policy apply_profs on public.professionals
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and verification_status in ('pending', 'unverified')
    and is_demo = false
  );

drop policy if exists own_profs on public.professionals;
create policy own_profs on public.professionals
  for select to authenticated
  using (auth.uid() = user_id);

-- Specialisations belong to the applicant's own row (checked against the
-- professionals table, which own_profs already limits to the caller).
drop policy if exists own_specs_ins on public.professional_specializations;
create policy own_specs_ins on public.professional_specializations
  for insert to authenticated
  with check (exists (
    select 1 from public.professionals p
    where p.id = professional_id and p.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 2. Organisations: applicant insert (pending only), public still sees
--    verified rows only via the existing pub_read_orgs policy.
-- ---------------------------------------------------------------------------
drop policy if exists apply_orgs on public.organizations;
create policy apply_orgs on public.organizations
  for insert to authenticated
  with check (verification_status = 'pending');

-- Applicants may read the organisation they applied for by matching their own
-- email — kept deliberately narrow, and only while it is still pending.
drop policy if exists own_orgs on public.organizations;
create policy own_orgs on public.organizations
  for select to authenticated
  using (
    verification_status in ('pending', 'unverified')
    and email = (auth.jwt() ->> 'email')
  );

-- ---------------------------------------------------------------------------
-- 3. Roles: users can read their own role rows; helper function for the UI
-- ---------------------------------------------------------------------------
drop policy if exists own_roles on public.user_roles;
create policy own_roles on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.ra_my_roles() returns text[]
language sql stable security definer set search_path = public as
$$ select coalesce(array_agg(r.role), '{}') from public.user_roles r where r.user_id = auth.uid() $$;
grant execute on function public.ra_my_roles() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Approval helper for administrators: sets a professional/org verified and
--    (optionally) grants the applicant a role. Use from the admin dashboard
--    or the SQL editor, e.g.:
--      select ra_approve_professional('prof-abc123');
-- ---------------------------------------------------------------------------
create or replace function public.ra_approve_professional(p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not ra_is_admin() then raise exception 'admins only'; end if;
  update public.professionals
     set verification_status = 'verified', verified_at = now()
   where id = p_id
   returning user_id into v_uid;
  if v_uid is not null then
    insert into public.user_roles(user_id, role)
    values (v_uid, 'professional')
    on conflict do nothing;
  end if;
  return true;
end $$;

create or replace function public.ra_approve_organization(p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not ra_is_admin() then raise exception 'admins only'; end if;
  update public.organizations
     set verification_status = 'verified', verified_at = now()
   where id = p_id;
  return true;
end $$;

grant execute on function public.ra_approve_professional(text) to authenticated;
grant execute on function public.ra_approve_organization(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Contact inbox: administrators may update the messages they can read
--    (base schema granted admin SELECT only, so "Mark reviewed" changed 0 rows)
-- ---------------------------------------------------------------------------
drop policy if exists admin_msg_update on public.contact_messages;
create policy admin_msg_update on public.contact_messages
  for update to authenticated
  using (ra_is_admin())
  with check (ra_is_admin());

-- After running this file you do NOT need to re-run the schema.
