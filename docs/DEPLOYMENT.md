# RightAware DEPLOYMENT.md — Vercel production

## What deploys
Static pages + `api/*` serverless functions + `vercel.json` (security headers,
no-cache for `sw.js`, extensionless-page redirects). No build command needed
(framework: static).

## Routing: `cleanUrls` must stay OFF (do not re-enable)
`cleanUrls: true` made Vercel 308-redirect every `*.html` URL to an
extensionless one. The service worker (`sw.js`) caches pages cache-first, and
its install `addAll()` follows those 308s — so it stored a **redirected
response** under the `.html` key. Answering a navigation request with a
redirected response makes Chromium fail the navigation with `net::ERR_FAILED`:
every internal link click (and every direct load of a cached page) landed on a
`chrome-error` page. This was reproduced on the live deployment and locally
against a Vercel-routing emulator (old config: 1/4 click steps passed; fixed
config: 7/7 passed).

Instead of `cleanUrls`:
- `*.html` URLs are served **directly (200, no redirect)** — every internal
  link and every direct page URL works.
- Extensionless URLs (`/about`) kept working via explicit `redirects` entries
  in `vercel.json` (page -> `page.html`, the safe direction; regenerate the
  list whenever a new HTML page is added).
- `sw.js` never stores redirect-followed bodies (`!res.redirected`) and its
  cache name was bumped to `rightaware-v4` so existing visitors purge any
  poisoned `rightaware-v3` entries on the next service-worker update.

If you ever add a redirect that can affect `*.html` URLs, re-run the local
click test first (SW-controlled navigation + redirect = `ERR_FAILED`).

## Steps
1. `vercel` (preview) → confirm pages render; `vercel --prod` for production.
2. Dashboard → Settings → Environment Variables: add Supabase / Paystack / AI
   values per environment (Production, Preview). Redeploy after changes.
3. Inject public keys to the browser: add a tiny snippet before `js/config.js`
   loads, e.g. `<script>window.__ENV__={SUPABASE_URL:"...",SUPABASE_PUBLISHABLE_KEY:"...",PAYSTACK_PUBLIC_KEY:"...",AI_ENDPOINT:"/api/ai/chat"}</script>`
   (template this in CI from env vars — never hard-code).
4. Verify: `/api/health` → 200; `/api/paystack/*` + `/api/ai/chat` → 501 until
   secrets are set (expected, safe); test a Paystack **test-mode** transaction
   end-to-end before going live.

## Production checks
- [ ] No secrets in any served file or repo history
- [ ] Security headers present (see `vercel.json`)
- [ ] 404/500 pages friendly; API errors JSON `{ok:false,error}` (no stack leaks)
- [ ] SW updates cleanly (version bump `CACHE` name in `sw.js` per release)
- [ ] Analytics/error tracking optional (privacy-friendly, cookieless preferred)
- [ ] Custom domain + HTTPS (automatic on Vercel), sitemap + robots submitted

## Rollback
Every deployment is immutable — roll back from the Vercel dashboard. Database
migrations are forward-only; snapshot before running new SQL.
