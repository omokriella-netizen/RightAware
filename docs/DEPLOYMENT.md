# RightAware DEPLOYMENT.md — Vercel production

## What deploys
Static pages + `api/*` serverless functions + `vercel.json` (security headers,
no-cache for `sw.js`, extensionless-page redirects, `/api/*.js` → `/api/*`
source-code redirect). Build command (already set in `vercel.json`):
`node tools/make-env.vercel.js` — generates `env.local.js` from the Vercel
environment through a fixed public whitelist before static files are
collected; no bundling, no framework.

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
  cache name is versioned per release (the poisoned `rightaware-v3` entries
  were purged by bumping to v4; the current release is `rightaware-v11`), so
  existing visitors always drop old caches on the next service-worker update.

If you ever add a redirect that can affect `*.html` URLs, re-run the local
click test first (SW-controlled navigation + redirect = `ERR_FAILED`).

## Steps
1. `vercel` (preview) → confirm pages render; `vercel --prod` for production.
2. Dashboard → Settings → Environment Variables: add Supabase / Paystack / AI
   values per environment (Production, Preview). Redeploy after changes.
3. Public keys reach the browser through `env.local.js`, regenerated on every
   build by `node tools/make-env.vercel.js` from the Vercel environment via a
   fixed public whitelist (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `PAYSTACK_PUBLIC_KEY`, `TURNSTILE_SITE_KEY`) — secrets
   (`SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `AI_API_KEY`,
   `TURNSTILE_SECRET_KEY`) are never copied, even when set. `TURNSTILE_SITE_KEY`
   is only the public Cloudflare site key; the Turnstile SECRET key belongs in
   the Supabase Auth CAPTCHA setting, never in a page (see ENVIRONMENT.md).
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
