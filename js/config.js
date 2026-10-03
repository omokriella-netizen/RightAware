/* RightAware runtime config (v2). No secrets here — only public flags.
   Backend keys (Supabase, Paystack secret, AI) live in server env vars / Vercel
   dashboard and are NEVER placed in frontend code. See .env.example + ENVIRONMENT.md.
   Public values arrive as window.__ENV__ via env.local.js — generated at build time by
   tools/make-env.vercel.js (whitelist only) and always loaded by js/supabase-client.js;
   without real values the app runs fully in local/offline demo mode. */
window.RA_CONFIG = Object.assign({
  APP_NAME: "RightAware",
  ENV: "local",                 // local | preview | production
  BACKEND: "local",             // local | supabase (switch when configured)
  SUPABASE_URL: "",             // public URL only; set via window.__ENV__ when ready
  SUPABASE_PUBLISHABLE_KEY: "", // publishable key only — never a secret/service key
  PAYSTACK_PUBLIC_KEY: "",      // public key only — secret stays server-side
  TURNSTILE_SITE_KEY: "",       // public Cloudflare Turnstile site key (CAPTCHA); empty = not configured
  AI_ENDPOINT: "/api/ai/chat",  // live route (Stage 7); answers 501 until AI_API_KEY is set server-side, client then falls back to labelled library matches
  SUPPORT_EMAIL_PLACEHOLDER: "hello@rightaware.ng",
  CONTACT_STATUS: "placeholder" // placeholder | live
}, (window.__ENV__ || {}));
window.RA_FEATURES = {
  backendConnected: !!(window.RA_CONFIG.SUPABASE_URL && window.RA_CONFIG.SUPABASE_PUBLISHABLE_KEY),
  aiConnected: !!(window.RA_CONFIG.AI_ENDPOINT),
  paymentsEnabled: false, // flips on only after Paystack server verification exists
  authMode: "demo"        // demo | supabase (see js/auth.js)
};
