/* Vercel serverless: initialize a Paystack payment. POST /api/paystack/initialize
   Body: { email, amountKobo, service, meta? }. Uses PAYSTACK_SECRET_KEY (server only).
   Returns { authorization_url, reference } — the client redirects the user to Paystack.
   NEVER trust client-side success callbacks: verify via /api/paystack/verify. */
const https = require("https");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return res.status(501).json({ ok: false, error: "Payments not configured (PAYSTACK_SECRET_KEY missing)." });
  const { email, amountKobo, service, meta } = req.body || {};
  if (!email || !amountKobo || amountKobo < 100) return res.status(400).json({ ok: false, error: "Valid email and amount (kobo, min 100) required." });
  const payload = JSON.stringify({ email, amount: amountKobo, metadata: Object.assign({ service: service || "consultation" }, meta || {}) });
  const options = { hostname: "api.paystack.co", path: "/transaction/initialize", method: "POST",
    headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
  const res2 = await new Promise((resolve, reject) => {
    const r = https.request(options, resolve); r.on("error", reject); r.write(payload); r.end();
  });
  let body = ""; for await (const c of res2) body += c;
  let data; try { data = JSON.parse(body); } catch (_) { return res.status(502).json({ ok: false, error: "Bad gateway response." }); }
  if (!data.status) return res.status(502).json({ ok: false, error: data.message || "Initialize failed." });
  // TODO: insert pending row into payments table (service role) before responding.
  return res.status(200).json({ ok: true, authorization_url: data.data.authorization_url, reference: data.data.reference });
};
