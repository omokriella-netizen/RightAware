/* Vercel serverless: verify a Paystack payment.
   GET /api/paystack/verify?reference=…
   Auth: signed-in users only — the Supabase JWT in Authorization: Bearer … is
   verified server-side (same helper as initialize.js); the reference itself is
   format-validated before it is used. Uses PAYSTACK_SECRET_KEY (server only).
   Only marks payments successful here, after Paystack confirms — never from
   client callbacks. */
"use strict";
const https = require("https");

const RATE_LIMIT = 20;          // requests per IP per 60s (best effort, per instance)
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
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "GET only" });
  try {
    const reference = (req.query && req.query.reference) || "";
    if (typeof reference !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(reference))
      return res.status(400).json({ ok: false, error: "reference required." });
    if (!process.env.PAYSTACK_SECRET_KEY)
      return res.status(501).json({ ok: false, code: "not_configured", error: "Payments are not configured." });
    const xff = req.headers && req.headers["x-forwarded-for"] ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : "";
    const ip = req.ip || xff || "unknown";
    if (rateLimited(ip))
      return res.status(429).json({ ok: false, code: "rate_limited", error: "Too many requests. Wait a moment and try again." });

    const acct = await verifiedAccount(req);
    if (!acct)
      return res.status(401).json({ ok: false, code: "unauthorized", error: "Sign in required." });

    const options = { hostname: "api.paystack.co", path: "/transaction/verify/" + encodeURIComponent(reference),
      method: "GET", headers: { Authorization: "Bearer " + process.env.PAYSTACK_SECRET_KEY } };
    const res2 = await new Promise((resolve, reject) => {
      const r = https.request(options, resolve); r.on("error", reject); r.end();
    });
    let body = ""; for await (const c of res2) body += c;
    let data; try { data = JSON.parse(body); } catch (_) { return res.status(502).json({ ok: false, error: "Bad gateway response." }); }
    const paid = !!(data.status && data.data && data.data.status === "success");
    // TODO: update payments row (reference, amount, user, service, status, paid_at) via service role.
    return res.status(200).json({ ok: true, verified: paid, status: paid ? "successful" : (data.data && data.data.status) || "pending",
      reference, amountKobo: data.data && data.data.amount });
  } catch(_) {
    return res.status(500).json({ ok: false, error: "Unexpected server error." });
  }
};
