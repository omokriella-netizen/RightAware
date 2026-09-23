# RightAware

**RightAware** is a Nigerian Civil Tech and Legal Awareness Platform.

> **Core purpose:** “Understand your Rights. Know your power.”

RightAware educates citizens about their legal rights, civic responsibilities, Nigerian
laws, constitutional rights, practical steps to take when rights are violated,
rights-protection organizations, access to legitimate legal professionals, and
simplified explanations of difficult legal information.

## Major features (v2 platform)

| Area | What exists today |
|---|---|
| Home | Hero, search, featured rights/resources/videos, triage, orgs, professionals preview, AI CTA, newsletter, libraries strip |
| About | Mission, vision, objectives, how-it-works, who-it-serves, disclaimer, partnerships |
| Explore Rights | 22-topic searchable library; 1 full guide (Police & Arrest), 1 partial draft, 20 structured overviews with verification states |
| Laws library | Searchable catalog (Constitution + 9 Acts as **awaiting-upload placeholders**), categories, related rights, upload architecture |
| Video library | Search, filters, featured rail, save-for-offline; ships **empty** (no invented videos) |
| Organizations | 8 support-body types + verified-records rail (0 published); no invented contacts |
| Professionals | Filterable demo directory (6 **fictional** profiles), full-profile schema, request flow, reviews with moderation + report |
| Account | Demo signup/login/recovery, profile, saved items, consultation history, notifications, settings |
| Admin | Locked-by-default architecture preview with entity counts + role model |
| RightAware AI | Demo knowledge-base assistant + server-route skeleton (`/api/ai/chat`) |
| Search | Global ranked search across pages, rights, laws, FAQs, videos |
| Get Help / Contact | Triage, report-a-concern generator, demo contact inbox |
| Offline-first | Service worker caches core guides; `offline.html` fallback; local-first storage |
| Payments | Paystack initialize/verify server stubs; UI stays disabled until configured |

**Content-safety rule:** nothing invented — no fabricated laws, sections, cases,
lawyers, organizations, contacts, numbers or statistics. Unverified content is
labelled `AWAITING UPLOAD / OVERVIEW / DRAFT / DEMO / PLACEHOLDER`.

## Technology architecture

- **Frontend:** static HTML + CSS + vanilla JS (no build step, no framework). Runs
  from `file://` and on any static host.
- **Content layer:** `content/*.js` (rights, laws, videos, organizations,
  professionals) + `data.js` index — plain JS so `file://` keeps working. Edit a
  file, reload the page. Schemas documented in CONTENT_UPLOAD_GUIDE.md.
- **App layer:** `js/config.js` (env/flags) → `js/db.js` (local-first storage with
  Supabase-shaped API) → `js/auth.js`, `js/reviews.js`, `js/ai.js`, `js/paystack.js`.
- **Backend (ready, not connected):** `supabase/schema.sql` (18 tables + RLS),
  `api/*` Vercel functions (health, Paystack initialize/verify, AI chat),
  `vercel.json`, `sw.js`.
- See SETUP.md, ENVIRONMENT.md, DATABASE.md, DEPLOYMENT.md.

## How to run

No build, no backend required:

1. Open `index.html` in a browser (double-click), **or**
2. Serve locally: `python -m http.server` (or `npx serve`) → `http://localhost:8000`.

## Environment variables

Copy `.env.example` → `.env` (local) or set values in the Vercel dashboard.
Only **public** keys may reach the browser via `window.__ENV__`; secrets stay
server-side. Details: ENVIRONMENT.md.

```bash
SUPABASE_URL= SUPABASE_PUBLISHABLE_KEY=        # public — browser OK
SUPABASE_SERVICE_ROLE_KEY=                     # SERVER ONLY
PAYSTACK_PUBLIC_KEY=                           # public — browser OK
PAYSTACK_SECRET_KEY=                           # SERVER ONLY (/api/paystack/*)
AI_API_KEY= AI_MODEL=                          # SERVER ONLY (/api/ai/chat)
```

## Adding content later

Edit the matching file in `content/` following its header schema, or use the
Admin preview (after backend setup). Full instructions: CONTENT_UPLOAD_GUIDE.md.

- New right → `content/rights.js` (+ summary row if it should appear on cards)
- New law → `content/laws.js` (status `awaiting-upload` until the file is stored)
- New video → `content/videos.js` (status `draft` → `published`)
- New organization → `content/organizations.js` (unverified until confirmed)
- New professional → onboarding with credential checks (never hand-add real people as demo)

## Deployment

Static hosting works as-is; Vercel adds server routes + env vars. See DEPLOYMENT.md.

## Status

v2 platform architecture — frontend complete, backend integration-ready, external
services **not** connected (no credentials have been supplied).
