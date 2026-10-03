-- RightAware — consultation events (additive). Run ONCE in the Supabase SQL
-- editor (SQL > New query > paste > Run). Safe to re-run (drop-if-exists /
-- create-or-replace everywhere).
-- Run AFTER supabase/consultations-access.sql (run that file FIRST — do NOT
-- re-run any earlier file).
--
-- WHY THIS EXISTS
--   Phase 3 gives the consultation workflow its decision path
--   (ra_consult_respond in consultations-access.sql: requested → accepted |
--   declined). The REQUESTER must learn the outcome through the SAME real
--   notification architecture the application workflow already uses — the
--   notifications table, the own_notif policy and the read/unread panels in
--   account.html / professional.html (applied by notifications-events.sql —
--   which this file does NOT touch). A database trigger keeps every write
--   path covered (the RPC, a direct UPDATE in the SQL editor, any future
--   admin tool) without changing ra_consult_respond or a single panel.
--
-- WHAT IT DOES
--   AFTER UPDATE of status on consultations, only when the status really
--   changed and the row carries its requester (new.user_id is not null):
--     · → accepted : "Consultation request accepted"
--     · → declined : "Consultation request declined"
--   Exactly ONE notification, to the requesting individual — never to
--   administrators, never to the professional, never to anyone else.
--
-- WHAT IT DOES NOT DO
--   * does not re-run the schema, does not alter any table, column or CHECK;
--   * does not change ANY existing policy — this file adds zero policies
--     (own_notif keeps every account's rows invisible to everyone else);
--   * grants nothing to anon, and trigger functions cannot be invoked
--     directly (PostgreSQL refuses: "trigger functions can only be called as
--     triggers"), so the EXECUTE grants below are fire-time hygiene only;
--   * cannot break an accept/decline: the whole body runs inside an exception
--     handler that logs a warning and lets the original UPDATE finish —
--     notifications are a best-effort side channel, never a prerequisite for
--     a decision;
--   * writes nothing except a notifications row for the account the event
--     genuinely concerns, and never on row creation (a fresh request is
--     'requested' — only a real transition notifies).
--
-- No data is backfilled: consultation notifications start when you run this
-- file, and only for decisions that happen afterwards.

-- ---------------------------------------------------------------------------
-- 1. Consultation decisions: the requesting individual is notified
-- ---------------------------------------------------------------------------
create or replace function public.ra_notif_on_consultation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if new.user_id is not null
     and new.status is distinct from old.status
     and new.status in ('accepted','declined') then
    select p.name into v_name from public.professionals p
     where p.id = new.professional_id limit 1;
    v_name := coalesce(nullif(trim(v_name), ''), 'The professional');
    insert into public.notifications (user_id, title, body)
    values (new.user_id,
            case when new.status = 'accepted'
                 then 'Consultation request accepted'
                 else 'Consultation request declined' end,
            case when new.status = 'accepted'
                 then v_name || ' accepted your consultation request. Open My Account to see the current status.'
                 else v_name || ' declined your consultation request. Open My Account to see the current status.'
            end);
  end if;
  return new;
exception when others then
  -- Best-effort only: the decision itself must never fail here.
  raise warning 'notification trigger (consultations): %', sqlerrm;
  return new;
end $$;

revoke execute on function public.ra_notif_on_consultation() from public, anon;
grant  execute on function public.ra_notif_on_consultation() to authenticated;

drop trigger if exists trg_notif_consultation on public.consultations;
create trigger trg_notif_consultation
  after update of status on public.consultations
  for each row execute function public.ra_notif_on_consultation();

-- After running this file you do NOT need to re-run the schema.
