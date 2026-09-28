# RightAware DATABASE.md — Supabase schema & swap-in guide

## Schema
`supabase/schema.sql` creates **18 tables** (all RLS-enabled):

`profiles`, `user_roles`, `right_categories`, `rights`, `legal_documents`,
`organization_contacts`(+`organizations`), `videos`, `professionals`,
`professional_specializations`, `professional_reviews`, `consultations`,
`saved_items`, `faqs`, `resources`, `contact_messages`, `notifications`,
`payments`, `audit_logs`.

Plus helper functions (`ra_is_admin`, `ra_has_role`), `updated_at` triggers,
and policies: public read for published/verified content; own-data access for
accounts; editor/moderator/admin backstops; contact-message open insert.

## Storage buckets
Create: `legal-docs` (**private**), `videos`, `thumbs`, `org-logos`,
`pro-photos` (**public read**). Suggested `storage.objects` policies:
- public read on the four public buckets;
- insert/update restricted to `editor`/`admin` roles (service role for user uploads like pro photos pending verification).

## Roles
`admin` (all) · `editor` (content) · `moderator` (reviews) · `professional`
(own profile) · `user` (own data). Assign via `user_roles` **only by an admin**
(or SQL). Frontend role displays are cosmetic — every privileged action is
re-checked in RLS / API routes.

## Swapping local → Supabase (per module)
1. Create `js/supabase-client.js`: loads the Supabase JS SDK (CDN), inits with
   `RA_CONFIG.SUPABASE_URL/KEY`, exports `RA_SUPA`.
2. `js/db.js`: when `RA_FEATURES.backendConnected`, route `savedList`,
   `consultations`, `messages`, `notifications`, `profile/settings` to the
   matching tables; keep localStorage as offline cache fallback.
3. `js/auth.js`: replace demo session with `supabase.auth` (signup, login,
   logout, `resetPasswordForEmail`); set `authMode="supabase"`.
4. Content reads: keep `content/*.js` as the offline bundle; after launch,
   generate it from a `supabase export` script (documented in
   CONTENT_UPLOAD_GUIDE.md) so the SW cache keeps working.
5. Reviews: `professional_reviews` insert as `pending`; moderation UI in
   `admin.html` calls an admin-only API (service role), never direct table writes.

## Seed data
Seed **categories + FAQs only** at first. Do NOT seed laws text, organizations,
or professionals until each record is verified. Demo professionals stay
`is_demo=true` and hidden from public queries (`verification_status='verified'
AND is_demo=false` policy).

## Optional add-on: applications & roles (`supabase/applications-access.sql`)
The base schema + `fix-access.sql` were applied as-is and must not be re-run.
One gap was identified later: `professionals` had **no** write policy at all and
applicants could not read back their own pending rows, so the signup flow
degrades to the `contact_messages` queue (which works today). The additive file
`supabase/applications-access.sql` (safe to re-run, touches no tables/data) adds:

- `edit_profs` — admins/editors can insert/update professional rows (approval);
- `apply_profs` / `own_profs` — an applicant may insert their own pending row and
  read it back (never others');
- `apply_specs` — specialisations attach only to the applicant's own row;
- `apply_orgs` / `own_orgs` — same for organisations (public still only ever sees
  `verification_status='verified'` rows via the existing policy);
- `own_roles` + `ra_my_roles()` — a signed-in user can resolve their own roles
  (used by `RA_AUTH.fetchRole()` in `js/auth.js`);
- `ra_approve_professional(id)` / `ra_approve_organization(id)` — SECURITY DEFINER
  helpers callable only by admins; the professional variant also grants the
  `professional` role (the check constraint allows
  `admin|editor|moderator|professional|user`; there is no `organisation` role —
  org accounts stay `user` and their status is tracked on the organisation row).

Frontend behaviour with/without it:
- **without** — signup applications are queued in `contact_messages` (admin sees
  them in admin.html → Applications), professional pending lists are empty with an
  explanatory note; nothing breaks.
- **with** — direct application rows, own-status panel entries, and one-click
  approve/reject from admin.html.
