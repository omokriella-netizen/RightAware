-- RightAware — notification events (additive). Run ONCE in the Supabase SQL
-- editor (SQL > New query > paste > Run). Safe to re-run (drop-if-exists /
-- create-or-replace everywhere).
-- Run AFTER supabase/dashboard-access.sql (already applied — do NOT re-run it).
--
-- WHY THIS EXISTS
--   The notifications table, the own_notif row-level-security policy and every
--   read/unread UI already exist (account.html, professional.html,
--   organization.html) — but nothing ever WROTE a row, so the lists were
--   permanently empty and the panels honestly said so ("roadmap item 2").
--   This file wires the one existing multi-user workflow — the application
--   lifecycle (submitted → pending → verified | rejected, plus reopen) — to
--   real notification rows, entirely inside the database so EVERY write path
--   (admin dashboard RPCs, admin direct-update fallbacks, the SQL editor) is
--   covered without touching a single line of the workflow itself.
--
-- WHAT IT DOES
--   1) AFTER INSERT on professionals/organizations (status 'pending'):
--        · the applicant gets "Application received" (professional: user_id;
--          organization: matched by e-mail against auth.users — the same
--          binding own_orgs uses);
--        · every administrator gets "New <kind> application" — unless the row
--          was just created by an admin session (they already know).
--   2) AFTER UPDATE when verification_status actually changes:
--        · → verified   : "Application approved"
--        · → rejected   : "Application not approved"
--        · → unverified : "Application not approved" (admin fallback path)
--        · → pending    : "Back under review" (admin reopened the row)
--
-- WHAT IT DOES NOT DO
--   * does not re-run the schema, does not alter any table, column or CHECK;
--   * does not change ANY existing policy (own_notif and every other policy
--     stay exactly as they are — this file adds zero policies);
--   * grants nothing to anon, and trigger functions cannot be invoked
--     directly (PostgreSQL refuses: "trigger functions can only be called as
--     triggers"), so the EXECUTE grants below are fire-time hygiene only;
--   * cannot break the verification workflow: the whole trigger body runs
--     inside an exception handler that logs a warning and lets the original
--     INSERT/UPDATE finish — notifications are a best-effort side channel,
--     never a prerequisite for an approval, rejection or reopening;
--   * writes nothing except notifications rows for the account(s) the event
--     genuinely concerns — row-level security (own_notif) keeps every
--     account's rows invisible to everyone else, exactly as before.
--
-- No data is backfilled: notifications start when you run this file, and only
-- for events that happen afterwards.

-- ---------------------------------------------------------------------------
-- 1. Professional applications: applicant + administrator notifications
-- ---------------------------------------------------------------------------
create or replace function public.ra_notif_on_professional() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
  v_name text := coalesce(new.name, 'this application');
  v_old text := null;
  v_new text := new.verification_status;
  v_admin uuid;
begin
  if TG_OP = 'INSERT' then
    if new.is_demo then return new; end if;            -- demo rows are never applications
    if v_new = 'pending' then
      if new.user_id is not null then
        insert into public.notifications (user_id, title, body)
        values (new.user_id,
                'Application received',
                'Your professional application — ' || v_name || ' — was submitted and is pending review. The decision will appear on this page and in My Account.');
      end if;
      if not ra_is_admin() then                        -- an admin's own create-record needs no ping
        for v_admin in select user_id from public.user_roles where role = 'admin' loop
          insert into public.notifications (user_id, title, body)
          values (v_admin,
                  'New professional application',
                  v_name || ' is pending review in the admin dashboard.');
        end loop;
      end if;
    end if;
    return new;
  end if;

  -- UPDATE: only a real state change notifies (never a same-state rewrite)
  v_old := old.verification_status;
  if v_old is distinct from v_new and new.user_id is not null then
    if v_new = 'verified' then
      insert into public.notifications (user_id, title, body)
      values (new.user_id,
              'Application approved',
              v_name || ' is now verified and visible in the public directory as a legal professional. The workspace link is on your My Account page.');
    elsif v_new in ('rejected', 'unverified') then
      insert into public.notifications (user_id, title, body)
      values (new.user_id,
              'Application not approved',
              'An administrator reviewed ' || v_name || ' and did not approve the listing. Your record stays private. Contact RightAware through the contact page if you need clarification.');
    elsif v_new = 'pending' then
      insert into public.notifications (user_id, title, body)
      values (new.user_id,
              'Back under review',
              v_name || ' was reopened by an administrator and is pending review again.');
    end if;
  end if;
  return new;
exception when others then
  -- Best-effort only: the approval/rejection itself must never fail here.
  raise warning 'notification trigger (professionals): %', sqlerrm;
  return new;
end $$;

revoke execute on function public.ra_notif_on_professional() from public, anon;
grant  execute on function public.ra_notif_on_professional() to authenticated;

drop trigger if exists trg_notif_professional on public.professionals;
create trigger trg_notif_professional
  after insert or update of verification_status on public.professionals
  for each row execute function public.ra_notif_on_professional();

-- ---------------------------------------------------------------------------
-- 2. Organization applications: same events, applicant matched by e-mail
--    (organizations carry no user_id — the binding is own_orgs' e-mail match)
-- ---------------------------------------------------------------------------
create or replace function public.ra_notif_on_organization() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := null;
  v_name text := coalesce(new.name, 'this application');
  v_old text := null;
  v_new text := new.verification_status;
  v_admin uuid;
begin
  if new.email is not null and coalesce(trim(new.email), '') <> '' then
    select u.id into v_uid from auth.users u
     where lower(u.email) = lower(new.email) limit 1;
  end if;

  if TG_OP = 'INSERT' then
    if v_new = 'pending' then
      if v_uid is not null then
        insert into public.notifications (user_id, title, body)
        values (v_uid,
                'Application received',
                'Your organization application — ' || v_name || ' — was submitted and is pending review. The decision will appear on this page and in My Account.');
      end if;
      if not ra_is_admin() then
        for v_admin in select user_id from public.user_roles where role = 'admin' loop
          insert into public.notifications (user_id, title, body)
          values (v_admin,
                  'New organization application',
                  v_name || ' is pending review in the admin dashboard.');
        end loop;
      end if;
    end if;
    return new;
  end if;

  v_old := old.verification_status;
  if v_old is distinct from v_new and v_uid is not null then
    if v_new = 'verified' then
      insert into public.notifications (user_id, title, body)
      values (v_uid,
              'Application approved',
              v_name || ' is now verified and visible in the public directory. The workspace link is on your My Account page.');
    elsif v_new in ('rejected', 'unverified') then
      insert into public.notifications (user_id, title, body)
      values (v_uid,
              'Application not approved',
              'An administrator reviewed ' || v_name || ' and did not approve the listing. Your record stays private. Contact RightAware through the contact page if you need clarification.');
    elsif v_new = 'pending' then
      insert into public.notifications (user_id, title, body)
      values (v_uid,
              'Back under review',
              v_name || ' was reopened by an administrator and is pending review again.');
    end if;
  end if;
  return new;
exception when others then
  raise warning 'notification trigger (organizations): %', sqlerrm;
  return new;
end $$;

revoke execute on function public.ra_notif_on_organization() from public, anon;
grant  execute on function public.ra_notif_on_organization() to authenticated;

drop trigger if exists trg_notif_organization on public.organizations;
create trigger trg_notif_organization
  after insert or update of verification_status on public.organizations
  for each row execute function public.ra_notif_on_organization();

-- After running this file you do NOT need to re-run the schema.
