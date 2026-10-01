# Professional & Organization dashboards — confirmed architecture and exact implementation

Status: **built (2026-10-01)** — `professional.html` and `organization.html`
are live with the additive `supabase/dashboard-access.sql`; see §3 for the
implementation record. The approved RightAware scope requires
dedicated dashboards/workspaces for **verified Legal Professionals** and
**verified Organizations**. This document confirms what exists in the code
today (verified file/line references), states the gap precisely, and specifies
the exact implementation needed — without expanding product scope. this page records the gap as specified and, in §3, what was delivered against
it after the auth/verification phase.

---

## 1. What exists today (confirmed in code)

### Identity and roles
- Roles come from `js/auth.js` → `fetchRole()`: server-side `ra_my_roles()`
  first, direct `user_roles` read as fallback, priority
  `admin > editor > moderator > professional > user`. When a user has no rows,
  the client falls back to `user` — **no database row is required for a
  regular account**.
- The `user_roles.role` CHECK allows `admin|editor|moderator|professional|user`
  (`supabase/schema.sql` line 20). **There is no `organization` role** —
  organization identity is the owned row itself, not a role.
- Approval grants identity atomically:
  - `ra_approve_professional` (`applications-access.sql` lines 98–113):
    sets `professionals.verification_status='verified'` **and** grants the
    `professional` role.
  - `ra_approve_organization` / the admin's direct update: sets
    `organizations.verification_status='verified'` only — nothing else to grant.
- Revocation is now symmetric: `ra_revoke_professional`
  (`supabase/verification-revoke.sql`) sets the row to `rejected`/`pending`
  **and** deletes the `professional` role in one admin-only transaction.
  Organizations need no role revocation: their verification status *is* their
  access (see public reads below), so a status change already revokes.

### Server-side access (RLS) — the real authorization layer
- `professionals`: owned by `user_id`.
  - `pub_read_profs` — the public sees **`verified` rows only**
    (`lawyers.html` directory).
  - `own_profs` (`verification-states.sql` lines 51–54) — the owner may
    **SELECT their own row in any state** (drives the account status card).
    It is SELECT-only: applicants cannot update their own row today.
  - `edit_profs` — editor/admin only: all writes, including approve/reject.
- `organizations`: bound by **email** (the table has no `user_id` column).
  - `pub_read_orgs` — public sees **`verified` rows only**
    (`organizations.html` directory).
  - `own_orgs` (`verification-states.sql` lines 56–60) — non-verified rows
    readable by the authenticated user whose JWT email matches (verified rows
    are already readable by anyone through `pub_read_orgs`).
  - `edit_orgs` — editor/admin only: all writes.
- `login.html` line 97: after sign-in, `admin → admin.html`, everyone else →
  `account.html` (or a sanitized `?next=`).
- `account.html`: session, role label (⚖️ for `professional`), application
  status cards (pending / rejected / verified for both kinds), logout.
- `admin.html`: the administrator's workspace (queue, approve, reject, reopen,
  inbox). Approve/reject are admin-only (RLS + `ra_is_admin()` RPCs).

### The gap versus the approved scope
There are **no `professional.html` / `organization.html` pages**. A verified
professional today gets only: the `professional` role, a public directory
listing, an ⚖️ label on their account page, and — per gap 1 of this phase —
symmetric revocation. A verified organization gets only: its public listing
and its account status card. Neither has a workspace, and neither can edit its
own listing (own-row policies are SELECT-only by design).

---

## 2. Exact implementation required (next implementation step)

### 2.1 Two new static pages
- **`professional.html`** and **`organization.html`**, following the existing
  static pattern (shared header/footer/styles, inline script compiled the same
  way as `admin.html`/`account.html`, `js/auth.js` + `js/db.js` included with
  the current `?v=` markers). No build step, no framework.

### 2.2 Access contract — server data decides, the page only renders
- **`professional.html`**: sign-in required (otherwise render the signed-out
  state, like `admin.html`). Workspace is shown **only if both** are true,
  each read from the server on every load:
  1. `ra_my_roles()` contains `professional` (granted only by approval,
     removed only by `ra_revoke_professional`), **and**
  2. the owner's own row (`own_profs`) reports `verification_status='verified'`.
  If the row says `pending`/`rejected`, the page renders the **status view**
  (same content as the account status card) — never the workspace. If the two
  ever disagree (legacy data, mid-transition), the page also falls back to the
  status view: role and status must agree before any workspace appears.
- **`organization.html`**: sign-in required; identity = owning an
  `organizations` row, read through `own_orgs` (JWT email match — no schema
  change needed, no `organization` role invented). Workspace only when that
  row reports `verified`; `pending`/`rejected` renders the status view.
- Client-side checks are never sufficient by themselves: every write is
  enforced by the server rules in 2.3, so forging a flag in the browser gains
  nothing.

### 2.3 One new additive SQL file: `supabase/dashboard-access.sql` (run once)
Applicants must be able to edit their own **non-status** profile content from
the workspace. Direct-table UPDATE policies cannot restrict *columns*, and
revoking column privileges would also block administrators (every PostgREST
writer uses the same `authenticated` role). Therefore, mirroring the existing
`ra_approve_*` design, ownership edits go through **security-definer functions
with explicit column whitelists** — the direct tables stay editor/admin-only:

1. **`ra_update_own_professional(p_id, …)`**
   - Requires `auth.uid()` to equal the row's `user_id` (else
     `raise exception 'not your row'`).
   - Updates **only**: `name, photo_path, qualification, experience_yrs,
     location, languages, bio, consultation_options, fee_note, availability`
     and manages the owner's `professional_specializations` child rows in the
     same transaction.
   - Never touches (not in the whitelist): `verification_status`,
     `verification_source`, `verified_at`, `is_demo`, `rating_avg`,
     `ratings_count`, `user_id`, `id`.
   - Callable by `authenticated` only.
2. **`ra_update_own_organization(p_id, …)`**
   - Requires the caller's JWT email to match the row's `email` (the existing
     binding — same test `own_orgs` uses).
   - Updates **only**: `name, logo_path, description, services,
     specialization, location, address, phone, website` (and
     `organization_contacts` child rows if the workspace edits hotlines).
   - Never touches: `verification_status`, `verification_source`,
     `verified_at`, `email` (the binding key — changed only by admins), `id`.
3. **`pro_read_consultations`** — a SELECT policy so a professional can read
   only the consultation rows addressed to their own row:
   `professional_id in (select id from professionals where user_id = auth.uid())`.
   **As built**, the predicate additionally requires
   `verification_status = 'verified'` on that own row — consultations are a
   verified-professional privilege, so an unverified/rejected professional
   record gains no read from this policy. Read-only; adds no new public
   exposure. (The professional-side consultation workflow itself is roadmap
   item 3 — this policy only prepares the row read.)
4. No changes to any existing policy, table, CHECK, or the approval/revoke
   functions. Nothing is granted to `anon`.
5. **As built: photo/logo uploads** (the phase brief asks for a real profile
   photo and organization logo) — `dashboard-access.sql` also creates the
   `pro-photos` / `org-logos` buckets if missing and adds three storage
   policies that confine INSERT/UPDATE/DELETE to the caller's own UUID folder
   with an image-extension check. Bucket READ was already public (docs/SETUP.md);
   file size (2 MB) is enforced client-side before upload. The
   `ra_update_own_*` functions validate that a changed `photo_path` /
   `logo_path` points into the caller's own folder, so a crafted call can
   never plant another account's file.

### 2.4 Login routing (small edits to existing files)
- `login.html` (line 97): `role === "admin" ? "admin.html" :
  role === "professional" ? "professional.html" : next` — the page itself
  downgrades to the status view when the row is not verified, so a pending
  professional still lands somewhere truthful.
- Organization owners have no distinct role: after sign-in, detect ownership
  the same way `account.html` already loads the org status (one `own_orgs`
  read by JWT email); if a row exists → `organization.html`.
- `account.html` gains a link/button to the workspace page for the current
  identity (professional or organization). `account.html` itself is unchanged
  otherwise: session, sync, saved items and status cards stay exactly as they
  are.

### 2.5 Workspace contents (approved scope only)
- **Professional workspace**: application status history (applied/decided
  dates from the own row), preview of their listing exactly as the public
  directory renders it, and edit forms for the whitelist fields via
  `ra_update_own_professional`. Edits re-render the preview; status changes
  remain exclusively the administrator's.
- **Organization workspace**: status history, public listing preview, edit
  forms for the whitelist fields via `ra_update_own_organization`.
- Both pages link back to `account.html` (session, language, saved items).
  Neither replaces account, admin, or any public page.
- **Not part of this step — workflows** (they land with their own roadmap
  items and plug into the panels below): consultation answers / accept-decline
  actions (item 3), review submission & moderation tooling (item 4),
  notification *production* (item 2), payments (item 7). **As built**, both
  pages nevertheless include the **read-only** structures the phase brief asks
  for: the consultations panel (real rows + status labels), the reviews panel
  (published rows + computed rating summary, never editable) and the
  notifications panel (own rows + real mark-read writes) — each with an honest
  empty state, each reading Supabase directly, none generating sample data.

### 2.6 Files touched by the dashboard step (exact list)
| File | Change |
|---|---|
| `professional.html` | new page |
| `organization.html` | new page |
| `supabase/dashboard-access.sql` | new, additive, run once |
| `login.html` | professional/organization redirect branch |
| `account.html` | workspace link for the current identity |
| `docs/SETUP.md`, `docs/DATABASE.md` | document the new SQL file |

No changes to `js/auth.js`, `js/db.js`, `sw.js`, RLS for public/anonymous
readers, or the approval/revoke functions. Because `login.html` and
`account.html` are never served from the cache (private shells) and the two
new pages ship with the current `?v=` markers, **no version/cache bump is
required for this step** (re-evaluate if `js/auth.js` or `js/db.js` change).

### 2.7 Invariants that must hold when this is built
- Role, status and access always agree (approve grants together, revoke
  removes together, dashboards require both).
- Server-first: RLS/functions decide; pages render what the server returns.
- Public exposure unchanged: only `verified` rows are ever publicly readable.
- Approval, rejection, revocation and status changes stay administrator-only.
- No fabricated content, no duplicate tables, no secrets in URLs or client
  state; profile and Saved Items sync untouched.

---

## 3. What was built (implementation record — 2026-10-01)

Built exactly to §2, with the phase brief's expanded read-only sections (see
§2.5 "As built") and the storage addition (§2.3 item 5).

### Pages
- **`professional.html`** — boot mirrors `admin.html` (backend gate →
  `fetchRole` → own-row read). Workspace renders **only** when `ra_my_roles()`
  contains `professional` **and** the own row (`own_profs`) says
  `verification_status='verified'`; every other state renders the status view
  with the record's real values (pending / rejected / unverified / role
  without record / role missing / read error — each self-diagnosing, naming
  the policy or file involved). Tabs: Overview (verification, profile
  completeness computed from real fields, availability, specialization,
  location, activity counts), Profile (whitelist edit form + photo upload →
  `ra_update_own_professional`, then a **re-read** before any success message),
  Public preview (exact `lawyers.html` card markup + explicit shown/never-shown
  lists), Consultations (real rows, exact raw status shown beside a friendly
  label; read-only), Reviews (published rows, live-computed rating summary,
  report/moderation flags, no edit path), Notifications (own rows, mark-read →
  `notifications` update + re-read), Account (password via
  `auth.updateUser`, logout, links).
- **`organization.html`** — same contract with the email-binding ownership:
  owned row (`own_orgs` pre-verification / public read when verified) **and**
  `verification_status='verified'`. Tabs: Overview, Profile (→
  `ra_update_own_organization` + logo upload), Public preview (exact
  `organizations.html` card), Contacts & inquiries (published
  `organization_contacts` + real help/contact links + an honest note that no
  organization-linked inquiry table exists yet), Notifications, Account.

### Existing-file edits
- `login.html` — professional → `professional.html`; then one `own_orgs`-style
  e-mail read routes an organization owner to `organization.html`, else `?next=`
  (any failure falls back to `?next=`, never a dead end).
- `account.html` — "Open professional workspace" button on the account card and
  an "Open workspace" button on a **verified** live application card (both
  paths only; session/sync/saved-items/status logic untouched).
- `docs/SETUP.md`, `docs/DATABASE.md` — document `dashboard-access.sql`.

### Not changed (deliberately)
`js/auth.js`, `js/db.js`, `sw.js` (no cache bump needed), all existing
policies/tables/CHECKs, the approval/revoke functions, `admin.html`, public
directory pages, and the contact-message flows. **Roadmap note for item 3:**
tightening `own_cons` `WITH CHECK` (so a client cannot point a new request at
another professional's record) belongs with the consultation workflow and was
left untouched here — `pro_read_consultations` already confines professional
reads to their own verified row.
