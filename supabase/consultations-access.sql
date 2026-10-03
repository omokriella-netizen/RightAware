-- RightAware — consultation requests (additive). Run ONCE in the Supabase
-- editor (SQL > New query > paste > Run). Safe to re-run (drop-if-exists /
-- create-or-replace / DO-block guard everywhere).
-- Run AFTER supabase/dashboard-access.sql and supabase/notifications-events.sql
-- (both already applied — do NOT re-run them).
--
-- WHY THIS EXISTS
--   The directory (lawyers.html), My Account and the professional workspace all
--   had consultation UI, but the table itself was unusable: its only policy
--   (`own_cons`, FOR ALL) let a signed-in requester insert, EDIT and DELETE
--   their own row with ANY status and ANY payment_reference — so a "request"
--   could be created already-accepted (self-approval spoof), no professional
--   could ever DECIDE anything, administrators had no read path, and pushes
--   pointed at professional_id = null. Roadmap phase 3 closes every hole and
--   wires the real workflow: a signed-in individual requests → a real row →
--   the verified professional accepts or declines through server
--   authorization → the requester reads the status from Supabase.
--
-- WHAT IT DOES
--   1) status CHECK — the V1 lifecycle is exactly requested → accepted or
--      requested → declined; no other state can ever be stored (NOT VALID
--      fallback if a legacy row already holds another value, so this file
--      still applies cleanly on a database with old data). payment_reference
--      stays NULLABLE (payments stay disabled until Paystack is configured —
--      see js/paystack.js; nothing here makes it NOT NULL).
--   2) replaces `own_cons` with two pinned policies:
--        own_cons_ins  INSERT, authenticated, WITH CHECK:
--          the row is YOURS (auth.uid() = user_id), starts as 'requested',
--          carries no payment reference, and points at a real VERIFIED,
--          non-demo professionals row — a request can no longer be aimed at
--          an unverified record, arrive pre-accepted or arrive pre-paid.
--        own_cons_sel  SELECT, authenticated: your own rows only.
--      The requester gets NO update and NO delete policy: a request can be
--      created and read, never self-approved, never edited into an accepted
--      state, never hard-deleted (history/audit preserved — cancellation
--      would be a status transition, and V1 has none).
--   3) admin_cons_read — administrators READ every consultation through a role
--      check inside RLS (ra_is_admin() is security-definer, so no policy
--      recursion); visibility is never hidden-UI.
--   4) ra_consult_respond(p_id, p_status) — the ONLY decision path: a
--      security-definer function that re-checks, in the database, that the
--      caller owns a VERIFIED, non-demo professionals row, that the row is
--      addressed to that record, and that the row is still 'requested'.
--      Returns the updated row as jsonb; the workspace re-reads it before
--      claiming success.
--
-- WHAT IT DOES NOT DO
--   * does not re-run the schema, does not touch any other table or the
--     notifications workflow (notifications-events.sql stays as applied);
--   * does not change any OTHER existing policy — own_cons is the only
--     policy replaced, under its own table, by name;
--   * adds no requester UPDATE/DELETE and no admin write path (V1: no
--     cancellation, no admin edit of consultations);
--   * grants nothing to anon — every existing table grant stays as it is and
--     the function is revoked from PUBLIC/anon and granted to authenticated;
--   * invents no lifecycle state and no payment behaviour.

-- ---------------------------------------------------------------------------
-- 1. V1 lifecycle CHECK (safe on any existing data)
-- ---------------------------------------------------------------------------
do $$
begin
  alter table public.consultations
    add constraint consultations_status_v1
    check (status in ('requested','accepted','declined'));
exception
  when duplicate_object then
    null;                                   -- already applied by an earlier run
  when check_violation then
    -- a legacy row holds another value: enforce the rule for NEW rows only
    alter table public.consultations
      add constraint consultations_status_v1
      check (status in ('requested','accepted','declined')) not valid;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Requester policies: pinned INSERT + own-row SELECT (replaces own_cons)
-- ---------------------------------------------------------------------------
drop policy if exists own_cons on public.consultations;

create policy own_cons_ins on public.consultations
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'requested'
    and payment_reference is null
    and professional_id in (
      select p.id from public.professionals p
      where p.verification_status = 'verified' and p.is_demo = false
    )
  );

create policy own_cons_sel on public.consultations
  for select to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Administrators read everything (role check inside RLS, never UI)
-- ---------------------------------------------------------------------------
create policy admin_cons_read on public.consultations
  for select to authenticated
  using (ra_is_admin());

-- ---------------------------------------------------------------------------
-- 4. The only decision path: accept / decline (server-authorized)
--    SECURITY DEFINER so the row-level checks run as the database, not as the
--    caller's hopes: verified-own-record → row addressed to that record →
--    still 'requested'. Nothing else can flip a status.
-- ---------------------------------------------------------------------------
create or replace function public.ra_consult_respond(p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.consultations%rowtype;
  v_owns boolean := false;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if p_status not in ('accepted','declined') then
    raise exception 'status must be accepted or declined (V1 lifecycle: requested -> accepted | declined)';
  end if;

  -- The caller must own a VERIFIED, non-demo professionals row.
  select exists (
    select 1 from public.professionals p
    where p.user_id = auth.uid()
      and p.verification_status = 'verified'
      and p.is_demo = false
  ) into v_owns;
  if not v_owns then
    raise exception 'only a verified professional can decide consultation requests';
  end if;

  -- Row lookup first; ownership checked before ANY row detail is revealed, and
  -- a stranger's row answers with the same message as a missing one (no
  -- existence leak for guessed ids).
  select * into v_row from public.consultations where id = p_id;
  if not found then
    raise exception 'consultation not found or not addressed to your professional record';
  end if;
  select exists (
    select 1 from public.professionals p
    where p.id = v_row.professional_id
      and p.user_id = auth.uid()
      and p.verification_status = 'verified'
      and p.is_demo = false
  ) into v_owns;
  if not v_owns then
    raise exception 'consultation not found or not addressed to your professional record';
  end if;

  if v_row.status is distinct from 'requested' then
    raise exception 'this request has already been decided (status: %)', v_row.status;
  end if;

  -- status is pinned again here, so a row decided between the checks above and
  -- this UPDATE cannot be overwritten (0 rows → handled below). updated_at is
  -- stamped by the schema's own t_cons trigger.
  update public.consultations
     set status = p_status
   where id = p_id and status = 'requested'
   returning * into v_row;
  if not found then
    raise exception 'this request was decided while you were deciding it — reload and read the current status';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke execute on function public.ra_consult_respond(uuid, text) from public, anon;
grant  execute on function public.ra_consult_respond(uuid, text) to authenticated;

-- After running this file you do NOT need to re-run the schema.
