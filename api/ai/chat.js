/* Vercel serverless: RightAware AI chat. POST /api/ai/chat { message, context? }
   Uses AI_API_KEY (server only). Ground answers in the verified knowledge base:
   forward the matched rights/laws summaries as context and instruct the model to
   cite only provided sources, add the legal-info disclaimer, and refuse to act as
   a lawyer. Returns 501 until AI_API_KEY is set. Provider-agnostic skeleton. */
const KNOWLEDGE_NOTE = "Base answers ONLY on the context supplied. Cite only given sources. Add: 'General legal information only — not legal advice.' Never claim to be a lawyer. Never invent laws, sections, cases, contacts or statistics.";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  const key = process.env.AI_API_KEY;
  if (!key) return res.status(501).json({ ok: false, error: "AI not configured (AI_API_KEY missing). Client falls back to demo knowledge base." });
  const { message } = req.body || {};
  if (!message || message.length > 2000) return res.status(400).json({ ok: false, error: "message (max 2000 chars) required." });
  // TODO: 1) retrieve top-k verified chunks from Supabase (rights/laws/faqs);
  //       2) call the AI provider with KNOWLEDGE_NOTE + chunks + message;
  //       3) return { text, links: [{t,u}] }. Log to audit_logs (no PII beyond user id).
  return res.status(501).json({ ok: false, error: "AI provider wiring pending — connect a provider here (see DEPLOYMENT.md)." });
};
