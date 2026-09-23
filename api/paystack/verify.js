/* Vercel serverless: verify a Paystack payment. GET /api/paystack/verify?reference=...
   Uses PAYSTACK_SECRET_KEY (server only). Only marks payments successful here,
   after Paystack confirms — never from client callbacks. */
const https = require("https");

module.exports = async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return res.status(501).json({ ok: false, error: "Payments not configured (PAYSTACK_SECRET_KEY missing)." });
  const reference = (req.query && req.query.reference) || "";
  if (!reference) return res.status(400).json({ ok: false, error: "reference required." });
  const options = { hostname: "api.paystack.co", path: "/transaction/verify/" + encodeURIComponent(reference),
    method: "GET", headers: { Authorization: "Bearer " + secret } };
  const res2 = await new Promise((resolve, reject) => {
    const r = https.request(options, resolve); r.on("error", reject); r.end();
  });
  let body = ""; for await (const c of res2) body += c;
  let data; try { data = JSON.parse(body); } catch (_) { return res.status(502).json({ ok: false, error: "Bad gateway response." }); }
  const paid = !!(data.status && data.data && data.data.status === "success");
  // TODO: update payments row (reference, amount, user, service, status, paid_at) via service role.
  return res.status(200).json({ ok: true, verified: paid, status: paid ? "successful" : (data.data && data.data.status) || "pending",
    reference, amountKobo: data.data && data.data.amount });
};
