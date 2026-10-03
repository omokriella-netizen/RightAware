-- RightAware — tighten EXECUTE on server-checked helper functions
-- (REVOKE-ONLY + explicit re-grant, idempotent).
-- Run ONCE in the Supabase SQL editor (SQL > New query > paste > Run).
--
-- WHY THIS IS REQUIRED (Phase 1 audit, blocker B16):
--   These four security-definer helpers still carry PostgreSQL's default
--   "EXECUTE granted to PUBLIC", so the anon role can invoke them. Read-only
--   probe on 2026-10-03 (anon role, no session):
--     ra_my_roles()                -> 200 []        (callable)
--     ra_approve_professional(..)  -> 400 "admins only" (reached the body)
--     ra_approve_organization(..)  -> 400 "admins only" (reached the body)
--     ra_revoke_professional(..)   -> 400 "admins only" (reached the body)
--   The three admin functions were stopped only by their internal ra_is_admin()
--   check; a deny-by-grant layer must sit in front of that check, and
--   ra_my_roles() has no purpose for an unauthenticated caller. This is the
--   same pattern already applied in supabase/consultations-access.sql
--   (revoke ... from public, anon).
--
-- WHAT IT DOES:
--   * revoke EXECUTE on the four functions from PUBLIC and anon;
--   * re-grant EXECUTE to authenticated — the admin dashboard, the
--     professional/organization workspaces and js/auth.js all call these with
--     a signed-in session, and every call site was verified to be post-sign-in
--     (js/auth.js:45-66, admin.html:656, login.html:115, professional.html:
--     234/709, organization.html:572). An explicit grant to authenticated
--     survives the PUBLIC revoke, so signed-in behaviour is unchanged;
--   * nothing else: no table, policy, row, function body or data is touched.
--     Re-running is a no-op (revokes and grants are idempotent).
--
-- Effect: anon callers get 42501 "permission denied for function" instead of
-- reaching the function body; authenticated callers are unaffected.
-- Note: ra_is_admin() / ra_has_role() are intentionally NOT touched here —
-- they are read-only boolean helpers with no side effects.

revoke execute on function public.ra_my_roles() from public, anon;
revoke execute on function public.ra_approve_professional(text) from public, anon;
revoke execute on function public.ra_approve_organization(text) from public, anon;
revoke execute on function public.ra_revoke_professional(text, text) from public, anon;

grant execute on function public.ra_my_roles() to authenticated;
grant execute on function public.ra_approve_professional(text) to authenticated;
grant execute on function public.ra_approve_organization(text) to authenticated;
grant execute on function public.ra_revoke_professional(text, text) to authenticated;
