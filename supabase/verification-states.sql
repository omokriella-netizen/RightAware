-- RightAware — verification workflow states (OPTIONAL, additive).
-- Run ONCE in the Supabase SQL editor (SQL > New query > paste > Run).
-- Run AFTER supabase/applications-access.sql (which is already applied) — this
-- file refreshes two of its policies to include the 'rejected' state.
-- Safe to re-run (drop-if-exists / create-or-replace everywhere).
--
-- WHY THIS EXISTS
--   The schema's CHECK constraint allows: unverified | pending | verified.
--   The application workflow needs four distinct states:
--     submitted → pending → verified (approved/published)
--                                  → rejected (admin said no — stays private)
--   Without this file, "rejected" cannot be stored: the admin dashboard falls
--   back to 'unverified' (still private) and tells you so. With it, the
--   dashboard, the applicant's account page ("Pending verification" vs
--   "Rejected" vs "Verified …") and the admin's "Recently decided" history
--   all work on real, distinct values.
--
-- WHAT IT DOES (all additive / data-safe)
--   1) Widens the existing CHECK constraints to also allow 'rejected'.
--      No rows are altered; every existing value remains valid.
--   2) Refreshes the applicant's own-row READ policies so an applicant can see
--      their rejected application in My Account.
--   3) Adds nothing public: the public SELECT policies still only expose
--      verification_status='verified'. Pending and rejected rows can never
--      appear in the public directories.
--
-- WHAT IT DOES NOT DO
--   * Does not re-run the schema, does not touch existing rows, does not
--     change any other policy, does not grant anything to anon.

-- ---------------------------------------------------------------------------
-- 1. Widen the status CHECK constraints (professionals + organizations)
-- ---------------------------------------------------------------------------
alter table public.professionals
  drop constraint if exists professionals_verification_status_check;
alter table public.professionals
  add constraint professionals_verification_status_check
  check (verification_status in ('unverified','pending','verified','rejected'));

alter table public.organizations
  drop constraint if exists organizations_verification_status_check;
alter table public.organizations
  add constraint organizations_verification_status_check
  check (verification_status in ('unverified','pending','verified','rejected'));

-- ---------------------------------------------------------------------------
-- 2. Applicants can read back their own row in ANY state
--    (so My Account can show "Pending verification", "Rejected" or
--     "Verified Legal Professional / Organization" truthfully).
-- ---------------------------------------------------------------------------
drop policy if exists own_profs on public.professionals;
create policy own_profs on public.professionals
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists own_orgs on public.organizations;
create policy own_orgs on public.organizations
  for select to authenticated
  using (verification_status in ('pending','unverified','rejected')
         and lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

-- ---------------------------------------------------------------------------
-- 3. Reminder: public reads are unchanged (only verified rows leave the
--    database). Verify with:
--    select verification_status, count(*) from organizations group by 1;
--    select verification_status, count(*) from professionals group by 1;
-- ---------------------------------------------------------------------------
