/* Vercel serverless: health check. GET /api/health → { ok:true, env, time }. */
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "method", error: "GET only." });
  }
  res.status(200).json({
    ok: true,
    app: "RightAware",
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    backend: process.env.SUPABASE_URL ? "supabase-configured" : "local-demo",
    time: new Date().toISOString()
  });
};
