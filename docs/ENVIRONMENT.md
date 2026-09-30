# RightAware ENVIRONMENT.md — variables & secret safety

## Source of truth
`.env.example` lists every variable. Copy to `.env` for local API work only —
`.env` is git-ignored and must never be committed.

## Rules
1. **Frontend may only receive PUBLIC values** (`SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, `PAYSTACK_PUBLIC_KEY`, `TURNSTILE_SITE_KEY`)
   via `window.__ENV__` (injected server-side on Vercel) — see `js/config.js`.
2. **Secrets stay server-side**: `SUPABASE_SERVICE_ROLE_KEY`,
   `PAYSTACK_SECRET_KEY`, `AI_API_KEY`, `TURNSTILE_SECRET_KEY` — used only
   inside `api/*` or the Supabase Auth CAPTCHA setting, set in the
   Vercel/Supabase dashboards (never `NEXT_PUBLIC_`, never in JS/HTML).
3. Without keys the app runs in **local demo mode** (`RA_FEATURES.*` false) and
   must not crash — every integration checks configuration first.

## Variables
| Name | Where | Purpose |
|---|---|---|
| SUPABASE_URL | browser+server | Supabase project URL |
| SUPABASE_PUBLISHABLE_KEY | browser | anon key for client SDK |
| SUPABASE_SERVICE_ROLE_KEY | server only | admin writes, payments update, AI retrieval |
| PAYSTACK_PUBLIC_KEY | browser | inline payment popup (future) |
| PAYSTACK_SECRET_KEY | server only | initialize + verify transactions |
| TURNSTILE_SITE_KEY | browser | Cloudflare Turnstile **public** site key (CAPTCHA widget) |
| TURNSTILE_SECRET_KEY | Supabase dashboard only | Cloudflare Turnstile **secret** — verified inside Supabase Auth; never in this repo or the browser |
| AI_API_KEY / AI_MODEL / AI_BASE_URL | server only | provider calls in `/api/ai/chat` |
| APP_ENV / SUPPORT_EMAIL | anywhere | labels, support display |

## CAPTCHA (Cloudflare Turnstile) — where each key goes
The CAPTCHA guards **Sign Up, Login and Password Reset**. It is compatible with
Supabase Auth: the browser solves the widget and passes the token as
`captcha_token` (`js/turnstile.js` → `js/auth.js`); **Supabase verifies the token
server-side with the secret**. The secret therefore lives ONLY in Supabase:

1. Cloudflare dashboard → Turnstile → Add site → copy the **site key** (public)
   and the **secret key**.
2. Put the **site key** in `.env.local` as `TURNSTILE_SITE_KEY=…`, then re-run
   `tools\make-env.ps1` (it is on the public whitelist). On Vercel, add it to
   the `window.__ENV__` snippet (DEPLOYMENT.md step 3).
3. Supabase Dashboard → **Authentication → Settings → CAPTCHA** → provider
   **Cloudflare Turnstile** → paste the **secret key** → enable. That single
   setting makes Supabase enforce the token on signup / sign-in / recovery.
4. Keep `TURNSTILE_SECRET_KEY` out of git and out of every page. If it ever
   leaks, rotate it in the Cloudflare dashboard.

Behaviour when not configured: with no site key the forms submit without a
widget (matching a Supabase project with CAPTCHA disabled) — nothing crashes
and the demo mode is unaffected. `.env.local` currently carries Cloudflare's
documented **always-pass TEST site key** (`1x00000000000000000000AA`) for local
development only; replace it with your real site key for production.

## Local connection from `.env.local`
The browser never reads `.env.local` (it contains secret **names**; only the
values below are public). Generate the browser file instead:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-env.ps1
```

This writes `env.local.js` at the project root (git-ignored) with a **strict
whitelist**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PAYSTACK_PUBLIC_KEY`,
`TURNSTILE_SITE_KEY` — nothing else. `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_CK_SECRET_KEY` and
`AI_API_KEY` are never copied, even when present in `.env.local`.
`js/supabase-client.js` loads it as the lowest-priority credential source
(server-injected `window.__ENV__` and the `ra_env` localStorage override still
win). Re-run the script after editing `.env.local`.

## Wiring checklist
- [x] `.env.local` created from `.env.example` (Supabase URL + publishable key filled; secrets empty)
- [x] `tools\make-env.ps1` run → `env.local.js` present (regenerate after env changes)
- [ ] Optional per-browser override: in the console run
  `RA_SUPA.configure("https://YOUR-REF.supabase.co", "YOUR-PUBLISHABLE-KEY")` —
  stored in that browser only, never in the repo. Clear with `RA_SUPA.clearLocal()`.
- [ ] Vercel → Project → Settings → Environment Variables set per environment
- [ ] CAPTCHA: `TURNSTILE_SITE_KEY` set in `.env.local` → re-run `make-env.ps1`
  (or add it to the Vercel `window.__ENV__` snippet); the Turnstile **secret**
  pasted into Supabase Authentication → Settings → CAPTCHA and enabled
- [ ] `/api/health` returns `backend: supabase-configured` after Supabase set
- [ ] No secret string appears in any committed file (`grep -ri "sk_live\|service_role\|pat_\|TURNSTILE_SECRET" — expect zero hits)
