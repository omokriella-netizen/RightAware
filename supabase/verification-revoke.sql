-- RightAware — verification REVOCATION add-on (OPTIONAL, additive).
-- Run ONCE in the Supabase SQL editor (SQL > New query > paste > Run).
-- Safe to re-run (create or replace). It does NOT alter any table, does NOT
-- touch existing data, and grants nothing to anon.
--
-- WHY THIS EXISTS
--   Approval (ra_approve_professional, supabase/applications-access.sql)
--   verifies the row AND grants the 'professional' role together. Rejecting or
--   reopening an already-approved professional used to change only
--   professionals.verification_status, so the account kept the 'professional'
--   role while the row said pending/rejected: role, status and access then
--   disagreed. This function makes revocation atomic and admin-only, exactly
--   mirroring approval:
--     1) set the row to 'rejected' or 'pending' and clear verified_at — on its
--        own that already removes the listing from every public directory
--        query (pub_read_profs only ever exposes verification_status='verified');
--     2) delete the granted 'professional' role from user_roles so the account
--        identity matches the row again.
--   Both statements run in ONE transaction: either both succeed or neither.
--
-- admin.html calls it from "Reject (keep private)" and "Reopen (back to
-- pending)". Until this file is applied, that page falls back to performing
-- the two halves client-side (its own admin policies allow both) and tells the
-- administrator to run this file; once applied, the fallback never runs.
--
-- Run order: after supabase/applications-access.sql and
-- supabase/verification-states.sql (both are prerequisites of this file).

create or replace function public.ra_revoke_professional(p_id text, p_state text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not ra_is_admin() then raise exception 'admins only'; end if;
  if p_state is null or p_state not in ('rejected','pending') then
    raise exception 'p_state must be rejected or pending';
  end if;
  update public.professionals
     set verification_status = p_state, verified_at = null
   where id = p_id
   returning user_id into v_uid;
  if v_uid is not null then
    delete from public.user_roles
     where user_id = v_uid and role = 'professional';
  end if;
  return true;
end $$;

grant execute on function public.ra_revoke_professional(text, text) to authenticated;
