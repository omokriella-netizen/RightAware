/* RightAware runtime config (v2). No secrets here — only public flags.
   Backend keys (Supabase, Paystack secret, AI) live in server env vars / Vercel
   dashboard and are NEVER placed in frontend code. See .env.example + ENVIRONMENT.md.
   Vercel can inject public values via a <script>window.__ENV__ = {...}</script> snippet;
   without it, the app runs fully in local/offline demo mode. */
window.RA_CONFIG = Object.assign({
  APP_NAME: "RightAware",
  ENV: "local",                 // local | preview | production
  BACKEND: "local",             // local | supabase (switch when configured)
  SUPABASE_URL: "",             // public URL only; set via window.__ENV__ when ready
  SUPABASE_PUBLISHABLE_KEY: "", // publishable key only — never a secret/service key
  PAYSTACK_PUBLIC_KEY: "",      // public key only — secret stays server-side
  TURNSTILE_SITE_KEY: "",       // public Cloudflare Turnstile site key (CAPTCHA); empty = not configured
  AI_ENDPOINT: "",              // e.g. "/api/ai/chat" when the API route is live
  OFFLINE_CACHE: "rightaware-v2",
  SUPPORT_EMAIL_PLACEHOLDER: "hello@rightaware.ng",
  CONTACT_STATUS: "placeholder" // placeholder | live
}, (window.__ENV__ || {}));
window.RA_FEATURES = {
  backendConnected: !!(window.RA_CONFIG.SUPABASE_URL && window.RA_CONFIG.SUPABASE_PUBLISHABLE_KEY),
  aiConnected: !!(window.RA_CONFIG.AI_ENDPOINT),
  paymentsEnabled: false, // flips on only after Paystack server verification exists
  authMode: "demo"        // demo | supabase (see js/auth.js)
};
