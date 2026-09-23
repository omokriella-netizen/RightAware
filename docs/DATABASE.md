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
