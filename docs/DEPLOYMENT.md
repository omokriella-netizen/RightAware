# RightAware DEPLOYMENT.md — Vercel production

## What deploys
Static pages + `api/*` serverless functions + `vercel.json` (clean URLs, security
headers, no-cache for `sw.js`). No build command needed (framework: static).

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
