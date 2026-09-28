# RightAware ENVIRONMENT.md — variables & secret safety

## Source of truth
`.env.example` lists every variable. Copy to `.env` for local API work only —
`.env` is git-ignored and must never be committed.

## Rules
1. **Frontend may only receive PUBLIC values** (`SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, `PAYSTACK_PUBLIC_KEY`) via `window.__ENV__`
   (injected server-side on Vercel) — see `js/config.js`.
2. **Secrets stay server-side**: `SUPABASE_SERVICE_ROLE_KEY`,
   `PAYSTACK_SECRET_KEY`, `AI_API_KEY` — used only inside `api/*`, set in the
   Vercel dashboard (never `NEXT_PUBLIC_`, never in JS/HTML).
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
| AI_API_KEY / AI_MODEL | server only | provider calls in `/api/ai/chat` |
| APP_ENV / SUPPORT_EMAIL | anywhere | labels, support display |

## Local connection from `.env.local`
The browser never reads `.env.local` (it contains secret **names**; only the
values below are public). Generate the browser file instead:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-env.ps1
```

This writes `env.local.js` at the project root (git-ignored) with a **strict
whitelist**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PAYSTACK_PUBLIC_KEY`
— nothing else. `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` and
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
- [ ] `/api/health` returns `backend: supabase-configured` after Supabase set
- [ ] No secret string appears in any committed file (`grep -ri "sk_live\|service_role\|pat_" — expect zero hits)
