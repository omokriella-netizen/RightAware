/* Vercel serverless: initialize a Paystack payment.
   POST /api/paystack/initialize   Body: { service, meta? }
   Auth: signed-in users only — the Supabase JWT in Authorization: Bearer … is
   verified server-side against SUPABASE_URL/auth/v1/user, and the payer e-mail
   comes from that verified account (never from the request body).
   Price: the amount comes ONLY from the server-side PRICES list below — a
   client-supplied amount can never reach Paystack. PRICES is intentionally
   still empty (fill it with verified product prices in Phase 3), so every
   request is currently refused with 501 not_configured.
   Uses PAYSTACK_SECRET_KEY (server only). Returns { authorization_url,
   reference } — the client redirects the user to Paystack.
   NEVER trust client-side success callbacks: verify via /api/paystack/verify. */
"use strict";
const https = require("https");

/* Server-side price list in kobo, keyed by service. Empty = not yet
   price-configured: no request can pass with a client-chosen amount. */
const PRICES = Object.create(null);

const RATE_LIMIT = 10;           // requests per IP per 60s (best effort, per instance)
const RATE_WINDOW = 60000;
const buckets = Object.create(null);
function rateLimited(ip){
  const now = Date.now();
  const arr = buckets[ip] || [];
  const keep = [];
  for (let i = 0; i < arr.length; i++) if (now - arr[i] < RATE_WINDOW) keep.push(arr[i]);
  if (keep.length >= RATE_LIMIT){ buckets[ip] = keep; return true; }
  keep.push(now);
  buckets[ip] = keep;
  return false;
}

/* Verify the caller's Supabase JWT server-side. Returns {id,email} or null.
   Fails closed: no header, bad/expired token, unreachable auth service or
   missing configuration all mean "not signed in". */
async function verifiedAccount(req){
  try {
    const h = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (typeof h !== "string") return null;
    const m = /^Bearer\s+(.+)$/.exec(h.trim());
    if (!m) return null;
    const base = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || "";
    if (!base || !key) return null;
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function(){ try { ctrl.abort(); } catch(_){} }, 8000) : null;
    try {
      const r = await fetch(base + "/auth/v1/user", {
        headers: { apikey: key, Authorization: "Bearer " + m[1].trim() },
        signal: ctrl ? ctrl.signal : undefined
      });
      if (!r.ok) return null;
      const u = await r.json();
      if (!u || !u.id || !u.email) return null;
      return { id: String(u.id), email: String(u.email) };
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch(_) { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  try {
    const xff = req.headers && req.headers["x-forwarded-for"] ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : "";
    const ip = req.ip || xff || "unknown";
    if (rateLimited(ip))
      return res.status(429).json({ ok: false, code: "rate_limited", error: "Too many requests. Wait a moment and try again." });

    const acct = await verifiedAccount(req);
    if (!acct)
      return res.status(401).json({ ok: false, code: "unauthorized", error: "Sign in required." });

    if (!process.env.PAYSTACK_SECRET_KEY)
      return res.status(501).json({ ok: false, code: "not_configured", error: "Payments are not configured." });

    const priceKeys = Object.keys(PRICES);
    if (!priceKeys.length)
      return res.status(501).json({ ok: false, code: "not_configured", error: "Payments are not price-configured yet." });

    let body = req.body;
    if (typeof body === "string"){ try { body = JSON.parse(body); } catch(_) { body = null; } }
    body = body || {};
    const service = typeof body.service === "string" ? body.service.trim() : "";
    if (!service || service.length > 64 || priceKeys.indexOf(service) === -1)
      return res.status(400).json({ ok: false, error: "Unknown service." });
    let meta = body.meta == null ? {} : body.meta;
    if (typeof meta !== "object" || Array.isArray(meta))
      return res.status(400).json({ ok: false, error: "meta must be a plain object." });
    let metaJson;
    try { metaJson = JSON.stringify(meta); } catch(_) { metaJson = null; }
    if (!metaJson || metaJson.length > 1000)
      return res.status(400).json({ ok: false, error: "meta is too large." });

    const payload = JSON.stringify({
      email: acct.email,
      amount: PRICES[service],
      metadata: Object.assign({ service: service, user: acct.id }, JSON.parse(metaJson))
    });
    const options = { hostname: "api.paystack.co", path: "/transaction/initialize", method: "POST",
      headers: { Authorization: "Bearer " + process.env.PAYSTACK_SECRET_KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
    const res2 = await new Promise((resolve, reject) => {
      const r = https.request(options, resolve); r.on("error", reject); r.write(payload); r.end();
    });
    let out = ""; for await (const c of res2) out += c;
    let data; try { data = JSON.parse(out); } catch(_) { return res.status(502).json({ ok: false, error: "Bad gateway response." }); }
    if (!data.status) return res.status(502).json({ ok: false, error: data.message || "Initialize failed." });
    // TODO: insert pending row into payments table (service role) before responding.
    return res.status(200).json({ ok: true, authorization_url: data.data && data.data.authorization_url, reference: data.data && data.data.reference });
  } catch(_) {
    return res.status(500).json({ ok: false, error: "Unexpected server error." });
  }
};
