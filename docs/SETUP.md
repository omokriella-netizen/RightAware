# RightAware SETUP.md — from zero to running

## 1. Run the site (no setup)
- **Easiest:** double-click `index.html`. Everything core works from `file://`.
- **Better (enables service worker):** serve the folder, then open the URL:
  - `python -m http.server 8000` → http://localhost:8000
  - or `npx serve .` → printed URL
- The service worker (`sw.js`) only registers on `http(s)`; on `file://` the app
  silently skips it and still works.

## 2. Project map
- Pages: `index, about, rights, laws, videos, organizations, resources, help, lawyers, ai, search, contact, login, signup, account, admin, offline` (+ `rights/arrest-rights`, `rights/topic`)
- Shared UI: `app.js` (nav, search redirect, newsletter, reveal, SW)
- Content: `content/rights.js|laws.js|videos.js|organizations.js|professionals.js`, `data.js`
- App logic: `js/config.js|db.js|auth.js|reviews.js|ai.js|paystack.js`
- Backend-ready: `supabase/schema.sql`, `api/**`, `vercel.json`, `.env.example`

## 3. Go beyond demo (order matters)
1. **Supabase:** create project → run `supabase/schema.sql` → create Storage buckets
   (`legal-docs` private; `videos`, `thumbs`, `org-logos`, `pro-photos` public-read)
   → copy URL + publishable key → ENVIRONMENT.md. Then implement
   `js/supabase-client.js` per DATABASE.md and flip `BACKEND`/`authMode`.
2. **Content:** verify + upload real documents/videos/orgs/professionals
   (CONTENT_UPLOAD_GUIDE.md). Nothing invented may be published.
3. **AI:** set `AI_API_KEY` server-side, finish `api/ai/chat.js`, set `AI_ENDPOINT=/api/ai/chat`.
4. **Paystack:** set keys, keep secret server-side, test initialize→verify in test mode.
5. **Deploy:** Vercel (DEPLOYMENT.md), set env vars, smoke-test, submit sitemap.

## 4. Daily editing
- Text/content: edit `content/*.js` or the page HTML directly; reload.
- Styles: `styles.css` (v2 components at the bottom).
- New page: copy `about.html` shell (header/nav/footer + `app.js`), add links +
  footer entries, add to `RA_SEARCH_INDEX` pages in `data.js`.

## 5. Troubleshooting
- Blank library cards → check the browser console for a JS error and that the
  `content/*.js` script tag exists before the page's inline script.
- Search missing new topics → ensure `content/rights.js` + `content/laws.js`
  are loaded on that page (index/search already do).
- `file://` + fetch errors → by design; content ships as JS, not JSON, for this reason.
- Push/remote: this checkout tracks no GitHub remote by policy of the current
  task — add your own remote when ready.
