-- RightAware — security-audit hardening (OPTIONAL, additive).
-- Date: 2026-10-07  ·  Source: security audit (hardening branch)
-- Status: REVIEW FIRST - NOT APPLIED (human review required before any run;
--         this file is review-by-humans only — never execute it automatically).
-- Run ONCE in the Supabase SQL editor (SQL > New query > paste > Run) ONLY
-- after review. Safe to re-run (drop-if-exists / create-or-replace / idempotent
-- revoke+grant everywhere; Postgres has no CREATE POLICY IF NOT EXISTS, so each
-- policy change is an explicit drop + create pair on its own name).
--
-- WHAT THIS IS / IS NOT
--  * It does NOT re-run the schema, does NOT alter any table, column or CHECK,
--    does NOT insert or update data rows, and does NOT touch any storage
--    bucket or storage.objects policy (owner decision — deliberately out of
--    scope here).
--  * It only replaces seven RLS policies / one helper-function body that the
--    audit found too permissive, plus one EXECUTE revoke — everything else in
--    every existing file stays exactly as applied.
--  * Additive-only principle: the public/legitimate surface is unchanged for
--    every caller the repo actually has; each change removes one forge/leak
--    path and nothing else. Every statement is guarded and rerunnable.
--
-- WHAT IT FIXES (audit findings 1-7)
--  1) insert_review (professional_reviews): WITH CHECK only proved
--     auth.uid()=user_id, so a client could insert a review already
--     status='published' with verified_interaction=true for ANY professional —
--     and pub_read_reviews exposes status='published' to everyone.
--  2) apply_orgs (organizations): WITH CHECK only proved
--     verification_status='pending' with NO ownership binding — any signed-in
--     user could insert an organizations row under a victim's e-mail
--     (trg_notif_organization then fans a notification to that victim and to
--     every administrator).
--  3) ra_approve_professional(text): approval kept whatever the client had put
--     in verification_source / verified_at / rating_avg / ratings_count
--     (apply_profs does not restrict those columns), so forged trust metadata
--     became public after approval.
--  4) pub_read_specs (professional_specializations): USING(true) leaked the
--     specialisations of pending/rejected applicants to anon.
--  5) pub_read_docs (legal_documents): USING(true) exposed awaiting-verification
--     rows (verification_source, file_path) to anon.
--  6) anyone_contact (contact_messages): WITH CHECK (true) let the client choose
--     status (no CHECK on the column) — a message could arrive pre-marked
--     'read'.
--  7) applications-access.sql line 90 re-grants EXECUTE on ra_my_roles() to
--     anon, undoing fix-exec-grants.sql; this file revokes it again.
--
-- WHAT IT DOES NOT DO
--   * no rate limiting on the contact insert (OUT OF SCOPE: spam control is
--     client-side — honeypot, time trap, per-device throttle, link check in
--     contact.html; a database-level limit is an owner decision);
--   * no storage bucket / storage.objects changes (owner decision);
--   * no table, column, constraint or data-row changes of any kind;
--   * nothing legitimate is dropped: every replaced policy/function is
--     recreated in the same place, with the same name, roles and structure.

-- ---------------------------------------------------------------------------
-- 1. Finding 1 — insert_review: a user-submitted review may only arrive as
--    status='pending' and can never claim a verified interaction.
--    schema.sql pins the states: status text default 'pending' check (status
--    in ('pending','published','hidden')) and verified_interaction boolean
--    default false ("server-set after real consultation"). The policy keeps
--    its original shape (INSERT, no role clause — the base grant already
--    withholds INSERT on this table from anon); publishing stays exclusively
--    with mod_review (moderator/admin UPDATE) or the service-role API.
-- ---------------------------------------------------------------------------
drop policy if exists insert_review on public.professional_reviews;
create policy insert_review on public.professional_reviews
  for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and coalesce(verified_interaction, false) = false
  );

-- ---------------------------------------------------------------------------
-- 2. Finding 2 — apply_orgs: bind the application row to the caller's own
--    account e-mail. organizations has NO user_id column (schema.sql), and
--    signup.html builds row.email from the SAME value it signs the account up
--    with (formOrg: `email:em` appears in both row and account — signup.html
--    ~659-665), so this binding matches what the site actually sends:
--      · direct insert (submitApplication step 2) only ever runs in a session
--        for that exact e-mail — a stale/different device session now fails
--        the check and falls back to the contact_messages queue (signup.html
--        step 3): the application is still recorded, no victim-e-mail row is
--        created and trg_notif_organization can no longer fan notifications
--        out under someone else's address;
--      · the confirm-and-sign-in replay (js/auth.js flushPendingApplication)
--        only replays payloads whose e-mail matches the signed-in account, so
--        it satisfies the binding by construction;
--      · admin/editor "create application record from this copy" (admin.html)
--        is unaffected: those inserts go through edit_orgs (FOR ALL, editor/
--        admin), a separate permissive policy — apply_orgs does not have to
--        admit them;
--      · consistent with the e-mail binding own_orgs / ra_update_own_organization
--        already use for reads and edits.
-- ---------------------------------------------------------------------------
drop policy if exists apply_orgs on public.organizations;
create policy apply_orgs on public.organizations
  for insert to authenticated
  with check (
    verification_status = 'pending'
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- ---------------------------------------------------------------------------
-- 3. Finding 3 — ra_approve_professional(p_id text): approval OVERWRITES the
--    client-supplied trust fields instead of keeping them (apply_profs does
--    not restrict verification_source / verified_at / rating_avg /
--    ratings_count). The body below is the original from
--    applications-access.sql lines 98-113 reproduced line-for-line with only
--    the marked additions — SECURITY DEFINER, set search_path = public, the
--    ra_is_admin() guard, the RETURN type, the role grant and the
--    on-conflict behaviour are all unchanged. Column names verified against
--    schema.sql (verification_source text, verified_at timestamptz,
--    rating_avg numeric, ratings_count int). Directory renders treat a NULL
--    rating_avg as "no rating yet" (lawyers.html / professional.html guard on
--    `rating_avg && ratings_count`), so clearing is display-safe.
--    NOTE: DROP resets PostgreSQL's default EXECUTE-to-PUBLIC, so the
--    revoke/grant pair from fix-exec-grants.sql is re-applied immediately
--    after the recreate — otherwise anon could reach the body again.
-- ---------------------------------------------------------------------------
drop function if exists public.ra_approve_professional(text);

create or replace function public.ra_approve_professional(p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not ra_is_admin() then raise exception 'admins only'; end if;
  update public.professionals
     set verification_status = 'verified', verified_at = now(),
         verification_source = 'rightaware-admin-approval',   -- audit #3 (added)
         rating_avg = null, ratings_count = 0                 -- audit #3 (added)
   where id = p_id
   returning user_id into v_uid;
  if v_uid is not null then
    insert into public.user_roles(user_id, role)
    values (v_uid, 'professional')
    on conflict do nothing;
  end if;
  return true;
end $$;

revoke execute on function public.ra_approve_professional(text) from public, anon;
grant  execute on function public.ra_approve_professional(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Finding 4 — pub_read_specs: only the specialisations of a parent
--    professionals row may leave the database, and only when that parent is
--    publicly visible anyway. FK column verified in schema.sql:
--    professional_specializations.professional_id -> professionals(id).
--    The original policy had no role clause, so none is added; the anon view
--    of professionals is itself limited by pub_read_profs (verified AND
--    non-demo), while editors/admins still see every applicant's
--    specialisations through edit_profs — nothing legitimate is lost,
--    pending/rejected applicants simply stop being readable by anon.
-- ---------------------------------------------------------------------------
drop policy if exists pub_read_specs on public.professional_specializations;
create policy pub_read_specs on public.professional_specializations
  for select
  using (exists (
    select 1 from public.professionals p
    where p.id = professional_id
      and p.verification_status = 'verified'
  ));

-- ---------------------------------------------------------------------------
-- 5. Finding 5 — pub_read_docs: only rows an editor/admin has actually marked
--    verification_status='verified' are readable (schema.sql default is
--    'awaiting-verification'). Verified in this repo: NO client code reads or
--    writes legal_documents at all (repo-wide grep of *.html, js/, api/ hits
--    only docs and SQL files) — the laws page renders from content/laws.js, so
--    no page breaks. Consequence an owner must accept: rows must be marked
--    verified to appear; until a document is marked verified, anon SELECT
--    returns nothing for it (editors/admins keep full access via edit_docs).
-- ---------------------------------------------------------------------------
drop policy if exists pub_read_docs on public.legal_documents;
create policy pub_read_docs on public.legal_documents
  for select
  using (verification_status = 'verified');

-- ---------------------------------------------------------------------------
-- 6. Finding 6 — anyone_contact: a public insert may only be a NEW message.
--    admin.html treats status 'new' as the new-message state ("Mark reviewed"
--    flips it to 'read'); every client writer either omits status (column
--    default 'new' applies: js/db.js pushMessage, contact.html, help.html) or
--    sends status:"new" explicitly (signup.html queue fallback, lawyers.html),
--    so no legitimate writer is affected. created_at already defaults to
--    now() in schema.sql (contact_messages: created_at timestamptz default
--    now()) and no client payload sends it, so NO ALTER is issued here — the
--    default stays the single source of delivery time (blocking an explicitly
--    supplied created_at would need column-level work; owner decision, not
--    done). Rate limiting / spam control is OUT OF SCOPE (see header), and a
--    CHECK constraint on contact_messages.status would be a table change —
--    deliberately not added; this policy is the enforcement point.
-- ---------------------------------------------------------------------------
drop policy if exists anyone_contact on public.contact_messages;
create policy anyone_contact on public.contact_messages
  for insert
  with check (status = 'new');

-- ---------------------------------------------------------------------------
-- 7. Finding 7 — ra_my_roles(): applications-access.sql line 90 re-grants
--    EXECUTE to anon, undoing fix-exec-grants.sql (an unauthenticated caller
--    has no purpose for it). Mirror fix-exec-grants.sql exactly: revoke from
--    PUBLIC and anon, keep the explicit grant to authenticated (js/auth.js
--    fetchRole calls the RPC after sign-in, so signed-in behaviour is
--    unchanged). The function itself is NOT recreated — only its grant moves.
-- ---------------------------------------------------------------------------
revoke execute on function public.ra_my_roles() from public, anon;
grant  execute on function public.ra_my_roles() to authenticated;

-- After running this file you do NOT need to re-run the schema.
