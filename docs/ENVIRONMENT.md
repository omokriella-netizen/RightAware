# RightAware ENVIRONMENT.md — variables & secret safety

## Source of truth
`.env.example` lists every variable. Copy to `.env.local` (the file
`tools\make-env.ps1` reads) for local work — `.env` and `.env.local` are both
git-ignored and must never be committed.

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
| AI_API_KEY / AI_MODEL / AI_BASE_URL | server only | provider calls in `/api/ai/chat` |
| APP_ENV / SUPPORT_EMAIL | anywhere | labels, support display |

## AI Provider Configuration (Google Gemini & OpenAI)
`/api/ai/chat` supports both Google Gemini and OpenAI natively:

### Google Gemini (Recommended)
1. In Google AI Studio, generate an API key.
2. In Vercel Project Settings → Environment Variables:
   - `AI_API_KEY`: `AIzaSy...` (your Gemini key)
   - `AI_MODEL`: `gemini-3.8-flash` (or omit for default)
   - `AI_BASE_URL` (optional): `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
     (if omitted or set to the SDK baseURL `.../openai/`, it is auto-resolved)

   *High-Availability & Spike Resilience:* RightAware automatically executes a resilient model cascade (`gemini-3.8-flash` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`) with a 10s per-model timeout and in-memory circuit breaker. If Google experiences high demand (HTTP 503) or latency spikes on the primary model, requests seamlessly failover to the ultra-low-latency `gemini-3.5-flash-lite` tier.

### OpenAI (Legacy / Alternative)
1. In OpenAI platform, generate an API key (`sk-...`).
2. In Vercel Project Settings → Environment Variables:
   - `AI_API_KEY`: `sk-...`
   - `AI_MODEL`: `gpt-4o-mini`
   - `AI_BASE_URL` (optional): `https://api.openai.com/v1/chat/completions`

## CAPTCHA Status (Removed)
Cloudflare Turnstile CAPTCHA has been retired from RightAware. Sign-up, login, and
password reset submit directly to Supabase Auth without CAPTCHA challenge. If CAPTCHA
was previously enabled in Supabase, ensure it is disabled under:
**Supabase Dashboard → Authentication → Attack Protection (or Security / CAPTCHA)**.

## Local connection from `.env.local`
The browser never reads `.env.local` (it contains secret **names**; only the
values below are public). Generate the browser file instead:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-env.ps1
```

This writes `env.local.js` at the project root (git-ignored) with a **strict
whitelist**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PAYSTACK_PUBLIC_KEY`,
`TURNSTILE_SITE_KEY` — nothing else. `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` and
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
- [x] CAPTCHA removed: Supabase Authentication → Attack Protection CAPTCHA disabled
- [ ] `/api/health` returns `backend: supabase-configured` after Supabase set
- [ ] No secret string appears in any committed file (`grep -ri "sk_live\|service_role\|pat_\|TURNSTILE_SECRET" — expect zero hits)
