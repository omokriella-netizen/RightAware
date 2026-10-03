# RightAware

**RightAware** is a Nigerian Civil Tech and Legal Awareness Platform.

> **Core purpose:** “Understand your Rights. Know your power.”

RightAware educates citizens about their legal rights, civic responsibilities, Nigerian
laws, constitutional rights, practical steps to take when rights are violated,
rights-protection organizations, access to legitimate legal professionals, and
simplified explanations of difficult legal information.

## Major features (current build)

| Area | What exists today |
|---|---|
| Home | Hero with supplied photography, search, popular rights, libraries strip, videos, resources, triage/help band, CTA. (Support-Network and Legal-Professionals promo sections intentionally removed.) |
| About | Mission, vision, objectives, how-it-works, who-it-serves, disclaimer, partnerships + supplied images |
| Explore Rights | 12-category searchable library; 1 full guide (Police & Arrest) with “read the original provisions” deep links, structured overviews with verification states, topic pages linking into the laws library |
| **Laws library** | **11 real supplied PDFs** (Constitution 1999, Electoral Act 2022, ACJA 2015, Marriage Act, Tenancy Law 2011 Lagos, Cybercrime paper, elections compilation, 2 academic papers, 2 scanned/guides) — in-browser viewer (page links), **full-text search across the supplied text with page-numbered snippets**, search-inside a document, section-variant queries, honest “scanned copy — not searchable” messaging, downloads. 10 further entries stay `AWAITING UPLOAD` placeholders. |
| Pidgin (i18n) | English ⇄ Nigerian Pidgin selector on every page (`content/i18n.js` + `js/i18n.js`, ~190 strings). **All Pidgin entries are drafts pending a qualified reviewer.** Statutory wording is never translated. |
| **Registration (3 pathways)** | `signup.html`: individual (account), legal professional (credential application), organisation (application). Applications: direct DB insert → contact-message queue → device-local fallback, each outcome reported honestly. Email confirmation is required (Supabase) — the "Check your inbox" / "Already registered" states and confirmation resend live here. `signup.html?path=professional` deep link. |
| Approval workflow | `admin.html` opens **only** to accounts holding the DB `admin` role (RLS-backed). New **Applications tab**: pending professionals/organisations + queued applications, approve / keep-private actions written with the admin session. |
| Account | Role-aware “My status” panel (role, application reference/status, live application state), Supabase-Auth login/signup with demo fallback |
| Get Help / Contact | Triage, **validated + spam-protected contact form** (honeypot, time-trap, per-device throttle, link-spam check) delivering to `contact_messages`, an offline queue that flushes when the backend is reachable, Report-a-concern routed to the same admin inbox, and the official contact details (general + partnerships email, phone, Abuja, Open 24/7) |
| Professionals | Live directory of **admin-approved** profiles (public SELECT is RLS-limited to `verified`) + clearly-marked demo profiles; on-site request flow posts to the queue when connected |
| Search | Ranked site search incl. laws deep links + “search exact wording inside the supplied laws” promo |
| Offline-first | Service worker **v11**: caches only same-origin public GETs; never caches Authorization headers, cross-origin responses, or private shells (`account`/`admin`/`login`/`signup`/`professional`/`organization`); `offline.html` staleness warning |
| Payments | Paystack endpoints exist (`api/paystack/*` — answers 501 until `PAYSTACK_SECRET_KEY` is set); no payment UI yet (`js/paystack.js` is ready but unwired, `paymentsEnabled:false`); no fees invented |
| API | `api/*` Vercel functions: health is live; AI chat + Paystack initialize/verify answer 501 until their server keys are set — server-side keys only |

**Content-safety rule:** nothing invented — no fabricated laws, sections, cases,
lawyers, organizations, contacts, numbers or statistics. Unverified content is
labelled `AWAITING UPLOAD / OVERVIEW / DRAFT / DEMO / PLACEHOLDER`.

## Technology architecture

- **Frontend:** static HTML + CSS + vanilla JS (no build step, no framework). Runs
  from `file://` and on any static host.
- **Content layer:** `content/*.js` (rights, laws, **law text indexes in
  `content/law-text/`**, videos, organizations, professionals, i18n) + `data.js`
  index — plain JS so `file://` keeps working. Edit a file, reload the page.
- **App layer:** `js/config.js` (env/flags) → `js/supabase-client.js` (connector:
  `window.__ENV__` → localStorage `ra_env` → demo fallback) → `js/db.js`,
  `js/auth.js` (demo + Supabase Auth, role fetch via `ra_my_roles()`), `js/i18n.js`,
  `js/reviews.js`, `js/ai.js`, `js/paystack.js` (client for the upcoming
  payment flow — not wired to any page yet).
- **Backend (schema already created; not re-run):** 19 tables + RLS in
  `supabase/supabase-final.sql`, grants in `supabase/fix-access.sql` (applied),
  **optional add-on** `supabase/applications-access.sql` (policies for direct
  applications, own-row reads, own-roles helper, approval functions — additive
  only), plus `verification-states.sql` / `verification-revoke.sql`
  (distinct Rejected state; atomic approve↔revoke — additive only).
- See docs/SETUP.md, ENVIRONMENT.md, DATABASE.md, DEPLOYMENT.md,
  CONTENT_UPLOAD_GUIDE.md.

## How to run

No build step required. The Supabase connection is picked up from
`.env.local` automatically:

1. Fill `.env.local` (copy `.env.example`) with your public values.
2. Generate the browser-safe env file (public whitelist only — secrets are
   never copied): `powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-env.ps1`
   → writes `env.local.js` (git-ignored).
3. Serve the folder (`npx serve`, or any static server) **or** open
   `index.html` directly — both connect; without step 2 the site runs fully
   in local demo mode (never crashes, honest "not connected" messages).

Credential priority in `js/supabase-client.js`: `window.__ENV__` (server
injection on Vercel) → localStorage `ra_env` (`RA_SUPA.configure` override)
→ `env.local.js` (generated local file). The manual override wins locally;
clear it with `RA_SUPA.clearLocal()`.

## Environment variables

Copy `.env.example` → `.env.local` (local) or set values in the Vercel
dashboard. Only **public** keys may reach the browser via `window.__ENV__`
/ `env.local.js`; secrets stay server-side — `tools/make-env.ps1` enforces a
whitelist so `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` and `AI_API_KEY`
are never written to any browser file. Details: docs/ENVIRONMENT.md.

```bash
SUPABASE_URL= SUPABASE_PUBLISHABLE_KEY=        # public — browser OK
SUPABASE_SERVICE_ROLE_KEY=                     # SERVER ONLY
PAYSTACK_PUBLIC_KEY=                           # public — browser OK
PAYSTACK_SECRET_KEY=                           # SERVER ONLY (/api/paystack/*)
AI_API_KEY= AI_MODEL= AI_BASE_URL=       # SERVER ONLY (/api/ai/chat)
```

## Adding content later

- New/updated law PDF → put the file in `assets/legal/`, add the entry to
  `content/laws.js`, then extract its text into `content/law-text/<file>.js`
  (key **must equal the `laws.js` id** — see CONTENT_UPLOAD_GUIDE.md).
- New Pidgin string → add `{ en, pcm }` in `content/i18n.js`; `pcm` needs a
  qualified reviewer’s sign-off before publication.
- New right/video/organization → `content/rights.js` / `videos.js` /
  `organizations.js` per their header schemas.

## Quality checks run for this build

- Static link/asset checker: no missing local links (880 refs checked, 0
  missing; 37 JS-template refs skipped by design).
- Headless-browser pass over the page set in **both modes** (live backend and
  demo — 19 pages at the time of that check, 22 today): **zero console
  errors**, all key markers present, no
  `[object Object]`/`undefined` leaks.
- Functional tests: laws full-text search (11 extracts for “arrest” across 5
  documents after fixing text-index keys), doc viewer deep links, site search,
  Pidgin render (`lang=pcm`), signup pathway switching, signup validation suite
  (7 cases, both modes), contact validation/spam suite (6 cases, both modes) —
  all passing.
- **Supabase connection (live, read-only):** connector boots from
  `env.local.js`; 19 table reads + 3 RPC probes + 2 grant probes all behaved
  exactly as the schema/RLS define (details in the delivery report). Same test
  passes from `file://`.
- Manual checks still required by a human: visual/responsive feel on real devices,
  keyboard-only navigation, screen-reader pass, and every flow that WRITES with
  a signed-in session (signup → login → role → approve), because the owner
  requested read-only testing (no rows created during QA).

## Status

Current build: laws library, Pidgin selector, three registration pathways with
admin approval, hardened offline caching, and a **live Supabase connection**
(auth mode, role reads, application status, admin queue against the real
database — verified read-only). `supabase/applications-access.sql` has been
**applied** on the project (probes confirm `ra_my_roles`,
`ra_approve_professional`, `ra_approve_organization` exist); re-run it once to
pick up the newly added `admin_msg_update` policy (inbox “Mark reviewed”
otherwise reports an honest 0-rows error). The Paystack/AI endpoints are live
but answer 501 until `PAYSTACK_SECRET_KEY` / `AI_API_KEY` are set in Vercel
Production. Pidgin
translations await qualified review.
