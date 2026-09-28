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
| **Registration (3 pathways)** | `signup.html`: general user (account), legal professional (credential application), organisation (application). Applications: direct DB insert → contact-message queue → device-local fallback, each outcome reported honestly. `signup.html?path=professional` deep link. |
| Approval workflow | `admin.html` opens **only** to accounts holding the DB `admin` role (RLS-backed). New **Applications tab**: pending professionals/organisations + queued applications, approve / keep-private actions written with the admin session. |
| Account | Role-aware “My status” panel (role, application reference/status, live application state), Supabase-Auth login/signup with demo fallback |
| Get Help / Contact | Triage, report generator, **validated + spam-protected contact form** (honeypot, time-trap, per-device throttle, link-spam check) delivering to `contact_messages` when connected, honest local-only message when not |
| Professionals | Live directory of **admin-approved** profiles (public SELECT is RLS-limited to `verified`) + clearly-marked demo profiles; on-site request flow posts to the queue when connected |
| Search | Ranked site search incl. laws deep links + “search exact wording inside the supplied laws” promo |
| Offline-first | Service worker **v3**: caches only same-origin public GETs; never caches Authorization headers, cross-origin responses, or private shells; `offline.html` staleness warning |
| Payments | Paystack test-mode server stubs only; UI stays disabled until configured; no fees invented |
| API stubs | `api/*` Vercel functions (health, Paystack initialize/verify, AI chat) — server-side keys only |

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
  `js/reviews.js`, `js/ai.js`, `js/paystack.js`.
- **Backend (schema already created; not re-run):** 19 tables + RLS in
  `supabase/supabase-final.sql`, grants in `supabase/fix-access.sql` (applied),
  **optional add-on** `supabase/applications-access.sql` (policies for direct
  applications, own-row reads, own-roles helper, approval functions — additive only).
- See docs/SETUP.md, ENVIRONMENT.md, DATABASE.md, DEPLOYMENT.md,
  CONTENT_UPLOAD_GUIDE.md.

## How to run

No build, no backend required:

1. Open `index.html` in a browser (double-click), **or**
2. Serve locally (any static server), e.g. `npx serve` → `http://localhost:8000`.

To test live features (login, applications, delivery), configure the connector once
in the browser console (values live in `.env.local`, git-ignored):

```js
RA_SUPA.configure("https://<project>.supabase.co", "sb_publishable_…")
```

## Environment variables

Copy `.env.example` → `.env` (local) or set values in the Vercel dashboard.
Only **public** keys may reach the browser via `window.__ENV__`; secrets stay
server-side. Details: docs/ENVIRONMENT.md.

```bash
SUPABASE_URL= SUPABASE_PUBLISHABLE_KEY=        # public — browser OK
SUPABASE_SERVICE_ROLE_KEY=                     # SERVER ONLY
PAYSTACK_PUBLIC_KEY=                           # public — browser OK
PAYSTACK_SECRET_KEY=                           # SERVER ONLY (/api/paystack/*)
AI_API_KEY= AI_MODEL=                          # SERVER ONLY (/api/ai/chat)
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

- Static link/asset checker: no missing local links (19 HTML files, 675 links).
- Headless-browser pass over all 19 pages: **zero console errors**, all key
  markers present, no `[object Object]`/`undefined` leaks.
- Functional tests: laws full-text search (11 extracts for “arrest” across 5
  documents after fixing text-index keys), doc viewer deep links, site search,
  Pidgin render (`lang=pcm`), signup pathway switching, 7 signup validation/submission
  cases, 6 contact validation/spam/delivery cases — all passing.
- Manual checks still required by a human: visual/responsive feel on real devices,
  keyboard-only navigation, screen-reader pass, live-backend flows (see final report).

## Status

Current build: laws library, Pidgin selector, three registration pathways with
admin approval, live contact delivery and hardened offline caching implemented and
statically tested. External services **not** connected (no credentials supplied);
Paystack/AI stay stubs. Pidgin translations await qualified review; the optional
`supabase/applications-access.sql` has **not** been applied yet (applications fall
back to the contact queue until it is).
