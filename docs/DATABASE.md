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

### Granting the first administrator
There is no bootstrap admin account — the role must be granted once from the
SQL editor (after the account's confirmation email has been opened, so
`email_confirmed_at` is set):

```sql
-- Grant admin to a CONFIRMED account — run ONCE (replace the address):
insert into public.user_roles (user_id, role)
select u.id, 'admin'
from auth.users u
where lower(u.email) = lower('you@example.com')
  and u.email_confirmed_at is not null
on conflict do nothing;

-- Verify — must return exactly one row:
select u.email, r.role, r.granted_at
from public.user_roles r
join auth.users u on u.id = r.user_id
where r.role = 'admin';
```

Then sign in on the site: `login.html` sends admins straight to
`admin.html`, and `account.html` shows an **Open admin dashboard** button.
Grant further roles the same way (one row per role). A user with no rows in
`user_roles` is a plain `user` — never insert `user` rows. The statement is
idempotent (`on conflict do nothing`), so re-running it changes nothing.

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

## Cross-device sync (profile & saved items — `RA_DB.v = "db6"`)
When signed in, Supabase is the source of truth; localStorage is the offline
cache. `js/db.js` `remote.syncNow()` runs once per account per page load
(`ra:backend-ready` / `ra:session-ready`) and after explicit saves:

- **Push gate** — the profile is pushed only when *this device* edited it
  (`ra_profile_dirty`, set by `saveProfile()`, cleared by a successful
  push/pull, dropped on account switch). Merely holding a local copy — which
  every synced device does after its first pull — never pushes.
- **Version guard (compare-and-set)** — every pull stores the row's
  `updated_at` in `ra_profile_base`; every push is
  `update … where id = auth.uid() and updated_at = <base>` (existing column +
  `ra_touch_updated` trigger, no schema change). Zero rows back means the
  account copy changed since this device last saw it: the **account copy wins**
  — local is replaced, the edit flag is cleared, and the page reports the
  conflict honestly. A stale device can therefore never overwrite a newer
  value. First save with no row inserts it; a row already exists with no base
  follows the same conflict rule.
- **Saved items** sync by identity (`user_id,item_type,ref` upsert + delete)
  with a 3-way merge against `ra_saved_base` — the server snapshot stored by
  every successful pull (same idea as `ra_profile_base`). Each sync:
  1. diffs local vs base → this device's **additions** and **removals**;
  2. flushes removals first (explicit `ra_removed` tombstones + derived ones),
     so the pull cannot restore a row deleted here (a failed delete is kept /
     re-derived and retried next sync);
  3. pushes **only the additions** (a save pushes only its own row) — the whole
     local list is never re-uploaded, so a stale device can never resurrect an
     item the account removed elsewhere;
  4. **always pulls**, even when the push failed: the account copy is the truth,
     and additions whose push did not land are retained locally (their diff
     still marks them new next sync, so they retry — nothing is lost).
  If `ra_saved` is absent entirely (first sign-in, storage cleared, account
  switch) the server copy is adopted as-is and nothing is deleted.
- **Session coverage on save pages** — `js/auth.js` must be loaded wherever
  `js/db.js` does account work, because `remote.uid()` reads `RA_AUTH`. Every
  page with db.js has auth.js (rights/topic + videos host save buttons and now
  load it). Without it a save had no uid → never pushed at save time and the
  page never synced — the original "saved items don't cross devices" bug.
- **Signed-out queue flush** — `runSync` also runs one message-only pass per
  page load when there is no session, so contact.html's undelivered-message
  queue retries without needing a signed-in page.
- **Pending-application attach guard** — `ra_pending_apps` is a LIST of
  payloads keyed by table + applicant e-mail (a second application on the same
  browser never overwrites an earlier applicant's payload); a legacy
  `ra_pending_app` slot migrates on read. `flushPendingApplication()` attaches
  only payloads whose email matches the signed-in account (a shared browser
  must never file person B's application under person A's account), and a row
  that already exists (unique violation) clears that payload instead of
  retrying forever.
- **Race guard** — a pull that lands after a local save started is discarded,
  so it never wipes the edit or its retry flag.
- The service worker cache (`rightaware-v10`) purges pre-multi-app `js/auth.js`
  (the single-slot `ra_pending_app` writer) from devices — v10 forces the new
  list-based flush code to run on the first load after its deploy; `RA_DB.v`
  reports the running sync version.
- **Version bump rule:** when the sync code changes, bump all of these
  together — `DB.v` in `js/db.js`, the `?v=` on **every** page that loads
  `js/auth.js`/`js/db.js` (account, admin, signup, login, lawyers, contact,
  videos, rights/topic), the `=== "<version>"` check in `paintSync()`, and the
  service-worker `CACHE` name. The versioned script URL is what guarantees an
  always-fresh HTML fetches fresh code even while an older service worker is
  still active; the sync pill on My Account then shows `SYNC <version>` (or
  `RELOAD — OLD APP COPY` if a stale copy is running).

## Seed data
Seed **categories + FAQs only** at first. Do NOT seed laws text, organizations,
or professionals until each record is verified. Demo professionals stay
`is_demo=true` and hidden from public queries (`verification_status='verified'
AND is_demo=false` policy).

## Applications & roles add-on (`supabase/applications-access.sql`)
The base schema + `fix-access.sql` were applied as-is and must not be re-run.
The additive file `supabase/applications-access.sql` (safe to re-run, touches no
tables/data) adds:

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
  org accounts stay `user` and their status is tracked on the organisation row);
- `admin_msg_update` — administrators can UPDATE `contact_messages` (the base
  schema granted SELECT only, so the inbox "Mark reviewed" button changed 0 rows).

**Status (verified 2026-09-28 by read-only probes from the site itself):**
sections 1–4 are **applied** on the live project — `ra_my_roles()` answers for
anonymous callers, and both approve functions answer "admins only" (i.e. exist
and are correctly guarded). The `admin_msg_update` policy is newer: **re-run the
file once** in the SQL editor to pick it up. Until then admin.html reports an
honest "0 rows changed — row-level security blocked the update" instead of
pretending the action succeeded.

Frontend behaviour with/without the file:
- **without** — signup applications are queued in `contact_messages` (admin sees
  them in admin.html → Applications), professional pending lists are empty with an
  explanatory note; nothing breaks.
- **with** — direct application rows, own-status panel entries, and one-click
  approve/reject from admin.html.

## Verification states add-on (`supabase/verification-states.sql`)
The schema's CHECK constraint allows `unverified | pending | verified`. The
workflow needs a fourth distinct state — **`rejected`** (submitted → pending →
verified **or** rejected). This optional, additive file (safe to re-run, run
**after** `applications-access.sql`) widens both status CHECK constraints and
refreshes the applicant's own-row read policies so My Account can show
"Pending verification" / "Rejected" / "Verified …" truthfully.

- **without** — admin.html stores a rejection as `unverified` (still private,
  never public) and tells the admin to run the file; nothing breaks.
- **with** — distinct rejected state, admin "Recently decided" history, and
  applicant-facing rejected status. Public SELECT policies are unchanged either
  way: only `verification_status='verified'` rows are ever public.

## Revocation add-on (`supabase/verification-revoke.sql`)
Approval (`ra_approve_professional`) verifies the row **and** grants the
`professional` role together, so rejecting or reopening an already-approved
professional must remove that role again — otherwise the account keeps a
professional identity while the row says pending/rejected. This optional,
additive file (safe to re-run, run **after** `applications-access.sql` and
`verification-states.sql`) adds the admin-only
`ra_revoke_professional(p_id, p_state)` function: it sets the row to
`rejected` or `pending` **and** deletes the granted `professional` role in one
transaction (state and role can never disagree).

- **without** — admin.html still changes the row's state directly and, as a
  fallback, removes the role through the admin's own `admin_roles` policy in a
  second step, then tells the administrator to run the file; nothing breaks.
- **with** — rejection/reopen is atomic server-side, the fallback never runs.
  Organizations have no role to revoke (their status *is* their access
  visibility), so they are unaffected.

## Dashboard access add-on (`supabase/dashboard-access.sql`)
The verified Professional / Organization dashboards (`professional.html`,
`organization.html` — see `docs/DASHBOARDS.md`) read through the existing RLS
but need an owner-locked **edit** path (direct-table UPDATE stays
editor/admin-only, and a row policy cannot restrict columns), a
professional-side consultation read, and own-folder photo/logo uploads. This
additive file (safe to re-run, run **after** the three files above) adds:

- `ra_update_own_professional(...)` — security definer, `auth.uid() = user_id`
  check with `'not your row'` failure, an explicit column whitelist (name,
  photo_path, qualification, experience_yrs, location, languages, bio,
  consultation_options, fee_note, availability — **never**
  verification/rating/reference/user_id columns), and it replaces the owner's
  `professional_specializations` child rows in the same transaction. EXECUTE
  is revoked from PUBLIC/anon and granted to `authenticated` only.
- `ra_update_own_organization(...)` — same design, bound to the JWT e-mail
  (the exact `own_orgs` binding); the application e-mail itself is not
  editable through it.
- `pro_read_consultations` — SELECT policy: consultation rows whose
  `professional_id` is the caller's own **verified** professionals row (the
  client-side `own_cons` policy was still in place when this file landed and
  is replaced later by `supabase/consultations-access.sql`, below).
- Storage policies confining `pro-photos` / `org-logos` INSERT/UPDATE/DELETE
  to the caller's own UUID folder (image extensions only; the buckets are
  created if missing and kept public-read).

- **without** — the dashboards still gate and render truthfully: overview,
  public preview, reviews, notifications and account panels work on the base
  schema, while profile save, photo/logo upload and the consultations panel
  show the exact server error plus this file's name. Nothing else breaks.
- **with** — profile saves re-read from the database before any success
  message, verified professionals see their consultation requests, and uploads
  stay folder-scoped. Public exposure is unchanged: anonymous readers still
  see only `verification_status='verified'` rows.

## Notification events (`supabase/notifications-events.sql`)
The `notifications` table, policy `own_notif` and every read/unread panel
(`account.html`, both dashboards) already existed — but no code path ever
wrote a row, so the lists stayed empty (the panels said so honestly). This
additive file (safe to re-run, run **after** `dashboard-access.sql`) wires
the existing application lifecycle to real notification rows, entirely inside
the database:

- `ra_notif_on_professional()` / `ra_notif_on_organization()` — AFTER-row
  triggers on `professionals` / `organizations`:
  - **INSERT** (`verification_status='pending'`) → the applicant gets
    *Application received* (professional: `user_id`; organization: e-mail
    matched against `auth.users` — the same binding `own_orgs` uses), and
    every administrator gets *New … application* (unless an admin session
    created the row);
  - **UPDATE** with a real state change → *Application approved*
    (→ verified), *Application not approved* (→ rejected/unverified),
    *Back under review* (→ pending, i.e. reopened).
- Covered write paths: the admin RPCs (`ra_approve_*`, `ra_revoke_*`), the
  admin dashboard's direct-update fallbacks and the SQL editor — no page code
  and **no policy changes** (zero new/changed policies; `own_notif` unchanged).
- Failure isolation: each trigger body runs inside an exception handler that
  logs a warning and lets the original INSERT/UPDATE finish — a notification
  problem can never break an approval, rejection or reopening.
- EXECUTE is revoked from PUBLIC/anon (trigger functions cannot be invoked
  directly — PostgreSQL only allows them as triggers). No data is
  backfilled: notifications start with events that happen after the file is
  run.
- **without** — everything still works, the notification lists simply stay
  empty. **with** — applicants and administrators see real, per-account,
  RLS-private rows in the existing notification UI.

## Consultation requests (`supabase/consultations-access.sql` + `supabase/consultations-events.sql`)
The `consultations` table existed from the base schema but was unusable: its
only policy (`own_cons`, FOR ALL) let a signed-in requester insert **and
edit/delete** their own row with any status/payment value (self-accept
spoofing), no professional could ever decide a request, administrators had no
read path, and the client pushed `professional_id = null`. These two additive
files (safe to re-run, run **after** `dashboard-access.sql` and
`notifications-events.sql`) wire the real V1 workflow — a signed-in individual
requests → a real row → the verified professional accepts or declines through
server authorization → the requester reads the status from Supabase:

- `consultations-access.sql`:
  - a status **CHECK** enforcing the V1 lifecycle exactly
    (`requested`, `accepted`, `declined` — added with a `NOT VALID` fallback
    if a legacy row holds another value); `payment_reference` stays nullable;
  - `own_cons` is **replaced** by `own_cons_ins` (INSERT, authenticated:
    `auth.uid() = user_id`, `status = 'requested'`, `payment_reference is
    null`, target row must be a verified, non-demo professionals row) and
    `own_cons_sel` (SELECT own rows only). The requester gets **no** update or
    delete policy — no self-approval, no status/payment spoof, no hard
    delete (history preserved; cancellation would be a status transition and
    V1 has none);
  - `admin_cons_read` — administrators read every consultation through
    `ra_is_admin()` inside RLS (visibility is a database decision, never
    hidden UI);
  - `ra_consult_respond(p_id, p_status)` — the only decision path:
    security-definer, `set search_path = public`, revoked from PUBLIC/anon
    and granted to `authenticated`. It re-checks that the caller owns a
    verified, non-demo professionals row, that the row is addressed to that
    record (a stranger's row answers with the same message as a missing one),
    and that the row is still `requested` — then updates and returns the row
    as jsonb. `professional.html` re-reads the row before claiming success.
- `consultations-events.sql`:
  - `ra_notif_on_consultation()` — AFTER UPDATE of `status` trigger, same
    best-effort pattern as `notifications-events.sql` (exception handler
    swallows errors so a decision can never fail because of it): when the
    status really changed to `accepted` or `declined` and the row carries its
    requester, **exactly one** notification lands in the existing
    `notifications` table for the requesting individual — nobody else. No
    policies, no ALTER, no backfill.

- **without** — the directory keeps writing `contact_messages` (signed-out
  fallback), the workspace consultations panel stays read-only and the RPC
  error names the file to run. **with** — a real request row exists per
  account, only the addressed verified professional can decide it (server-side
  re-checks), the requester sees the status live in My Account and is
  notified once through the existing notification architecture.
