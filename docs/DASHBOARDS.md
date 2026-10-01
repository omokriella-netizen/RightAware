# Professional & Organization dashboards — confirmed architecture and exact implementation

Status: **specified, not yet built.** The approved RightAware scope requires
dedicated dashboards/workspaces for **verified Legal Professionals** and
**verified Organizations**. This document confirms what exists in the code
today (verified file/line references), states the gap precisely, and specifies
the exact implementation needed — without expanding product scope. Building
these two pages is the next implementation step after the auth/verification
phase.

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
   Read-only; adds no new public exposure. (The professional-side consultation
   workflow itself is roadmap item 3 — this policy only prepares the row
   read.)
4. No changes to any existing policy, table, CHECK, or the approval/revoke
   functions. Nothing is granted to `anon`.

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
- **Not part of this step** (they land with their own roadmap items and plug
  into these pages): consultation inbox/answers (item 3), reviews & ratings
  (item 4), notifications (item 2), payments (item 7).

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
