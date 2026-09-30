/* Vercel serverless: RightAware AI — POST /api/ai/chat { message, context? }
   Stage 7 (real AI): calls an OpenAI-compatible chat-completions provider with
   server-only credentials, grounded in the verified RightAware knowledge base
   loaded from this repo (content/rights.js + content/laws.js + data.js FAQs).
   Environment (ALL server-only — the browser never sees them):
     AI_API_KEY   required. Without it the route answers 501 and the client
                  falls back to clearly labelled library matches (demo).
     AI_MODEL     optional. Defaults to gpt-4o-mini.
     AI_BASE_URL  optional. Defaults to https://api.openai.com/v1/chat/completions.
                  Point it at any OpenAI-compatible endpoint (Groq, OpenRouter,
                  Mistral, Google Gemini OpenAI-compatibility layer, ...).
   Guarantees: cites only the supplied sources, never invents laws, sections,
   cases, statistics, organisations, contacts or URLs; always carries the
   legal-info disclaimer; never claims to be a lawyer; never echoes the API key;
   never logs message content. Best-effort in-memory rate limit of 20 messages
   per minute per IP (per function instance). */
"use strict";

const DISCLAIMER = "General legal information only — not legal advice. Verify important points with a qualified professional.";

const SYSTEM = [
  "You are RightAware AI, an assistant that gives general Nigerian legal and civic information.",
  "STRICT RULES:",
  "1. Base answers ONLY on the CONTEXT supplied with the question. Cite the sources you used by name in square brackets, e.g. [Police & Arrest Rights].",
  "2. Never invent laws, sections, cases, statistics, organisations, contacts or URLs. If the context does not contain the answer, say you do not have that information here and point to the Rights Library or Get Help.",
  "3. Never claim to be a lawyer and never present anything as legal advice. You give general legal information only.",
  "4. Plain language, short paragraphs, maximum about 180 words. No markdown; use - for list items.",
  "5. End every answer with exactly: General legal information only — not legal advice. Verify important points with a qualified professional.",
  "6. If someone may be in immediate danger or is under arrest, start with practical next steps and mention Get Help.",
  "7. Never ask for or repeat passwords, OTPs, PINs or bank details; remind the user not to share them."
].join("\n");

const RATE_LIMIT = 20;          // messages per IP per 60s (best effort, per instance)
const RATE_WINDOW = 60000;
const PROVIDER_TIMEOUT = 20000; // ms
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1/chat/completions";
const FALLBACK_LINKS = [{ t: "Browse rights library", u: "rights.html" }, { t: "Get Help", u: "help.html" }];

/* ---------- verified knowledge base (loaded once per instance) ---------- */
let kbCache = null;
function str(v){ return v == null ? "" : (Array.isArray(v) ? v.join(" ") : String(v)); }
function clip(s, n){ s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 3) + "..." : s; }
function kb(){
  if (kbCache) return kbCache;
  const g = globalThis;
  if (typeof g.window === "undefined") g.window = g;
  try { require("../../content/rights.js"); } catch (e) { /* keep what loaded */ }
  try { require("../../content/laws.js"); } catch (e) { /* keep what loaded */ }
  try { require("../../data.js"); } catch (e) { /* keep what loaded */ }
  const w = g.window || g;
  const items = [];
  (w.RA_RIGHTS_DETAIL || []).forEach(function(r){
    if (!r || !r.title) return;
    const txt = String(r.title) + ": " + str(r.summary) + (str(r.keywords) ? " Keywords: " + str(r.keywords) : "");
    items.push({
      kind: "Rights Library",
      t: String(r.title),
      u: r.fullGuide ? String(r.fullGuide) : "rights/topic.html?id=" + encodeURIComponent(String(r.id || "")),
      txt: txt,
      hay: txt.toLowerCase(),
      tl: String(r.title).toLowerCase()
    });
  });
  (w.RA_LAWS || []).forEach(function(l){
    if (!l || !l.title) return;
    const txt = String(l.title) + ": " + str(l.description) + (str(l.category) ? " (" + str(l.category) + (str(l.docType) ? ", " + str(l.docType) : "") + ")" : "");
    items.push({
      kind: "Laws & Legal Documents",
      t: String(l.title),
      u: "laws.html",
      txt: txt,
      hay: txt.toLowerCase(),
      tl: String(l.title).toLowerCase()
    });
  });
  (w.RA_FAQS || []).forEach(function(f){
    if (!f || !f.q) return;
    const txt = String(f.q) + " — " + str(f.a);
    items.push({
      kind: "FAQ",
      t: String(f.q),
      u: "resources.html#faqs",
      txt: txt,
      hay: txt.toLowerCase(),
      tl: String(f.q).toLowerCase()
    });
  });
  kbCache = items;
  return items;
}

/* ---------- keyword retrieval over the knowledge base ---------- */
const STOP = {};
("the a an of and or to in is are my i me can how what do does for with on at be was were this that if it you your about please help there here their they them from into out up down not yes was has have had been being will would should could just also any all some more than then when who whom which what why how".split(" ")).forEach(function(w){ STOP[w] = 1; });
function stems(t){
  const out = [t];
  if (t.length > 4 && /(ed|es|s)$/.test(t)) out.push(t.replace(/(ed|es|s)$/, ""));
  if (t.length > 5 && /ing$/.test(t)) out.push(t.replace(/ing$/, ""));
  return out;
}
function tokens(s){
  return String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(function(t){ return t.length > 2 && !STOP[t]; });
}
function score(it, ts){
  let sc = 0;
  for (let i = 0; i < ts.length; i++){
    const group = stems(ts[i]);
    let hitTitle = false, hitBody = false;
    for (let j = 0; j < group.length; j++){
      if (it.tl.indexOf(group[j]) >= 0) hitTitle = true;
      if (it.hay.indexOf(group[j]) >= 0) hitBody = true;
    }
    if (hitTitle) sc += 4; else if (hitBody) sc += 2;
  }
  return sc;
}
function retrieve(q, items){
  const ts = tokens(q);
  if (!ts.length) return [];
  return items.map(function(it){ return { it: it, sc: score(it, ts) }; })
    .filter(function(x){ return x.sc >= 2; })
    .sort(function(a, b){ return b.sc - a.sc; })
    .slice(0, 3)
    .map(function(x){ return x.it; });
}
function buildContext(srcs){
  if (!srcs.length) return "(No verified source matched this question. Say you do not have that information in the sources, and point the user to the Rights Library and Get Help. Do not answer from memory.)";
  return srcs.map(function(s, i){ return "[" + (i + 1) + "] (" + s.kind + ") " + s.txt; }).join("\n\n").slice(0, 6000);
}

/* ---------- best-effort per-instance rate limit ---------- */
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

/* ---------- handler ---------- */
module.exports = async (req, res) => {
  const configured = !!process.env.AI_API_KEY;
  if (req.method !== "POST"){
    return res.status(405).json({ ok: false, code: "method", error: "POST only.", configured: configured });
  }
  let body = req.body;
  if (typeof body === "string"){ try { body = JSON.parse(body); } catch (e) { body = null; } }
  body = body || {};
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 2000){
    return res.status(400).json({ ok: false, code: "bad_request", error: "message (1-2000 chars) required." });
  }
  const xff = req.headers && req.headers["x-forwarded-for"] ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : "";
  const ip = xff || req.ip || "unknown";
  if (rateLimited(ip)){
    return res.status(429).json({ ok: false, code: "rate_limited", error: "Too many messages. Wait a moment and try again." });
  }
  if (!configured){
    return res.status(501).json({
      ok: false,
      code: "not_configured",
      error: "AI not configured (AI_API_KEY missing). The assistant falls back to labelled library matches.",
      links: FALLBACK_LINKS
    });
  }

  const srcs = retrieve(message, kb());
  const extra = typeof body.context === "string" && body.context ? "\n\nPAGE CONTEXT (supplied by the user's browser; may be unreliable):\n" + clip(body.context, 1200) : "";
  const user = "CONTEXT (verified RightAware content — the only permitted sources):\n" + buildContext(srcs) + extra + "\n\nQUESTION:\n" + message;

  const base = process.env.AI_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  let raw;
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(function(){ try { ctrl.abort(); } catch (e) {} }, PROVIDER_TIMEOUT) : null;
  try {
    const r = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.AI_API_KEY },
      body: JSON.stringify({
        model: model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [ { role: "system", content: SYSTEM }, { role: "user", content: user } ]
      }),
      signal: ctrl ? ctrl.signal : undefined
    });
    if (!r.ok) return res.status(502).json({ ok: false, code: "provider_error", error: "AI provider returned status " + r.status + ".", links: FALLBACK_LINKS });
    raw = await r.json();
  } catch (e) {
    return res.status(502).json({ ok: false, code: "provider_error", error: "AI provider unreachable.", links: FALLBACK_LINKS });
  } finally {
    if (timer) clearTimeout(timer);
  }

  const text = raw && raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content;
  if (!text) return res.status(502).json({ ok: false, code: "provider_error", error: "AI provider returned no answer.", links: FALLBACK_LINKS });

  return res.status(200).json({
    ok: true,
    text: String(text).trim(),
    links: srcs.slice(0, 3).map(function(s){ return { t: s.t, u: s.u }; }),
    sources: srcs.slice(0, 3).map(function(s){ return { t: s.t, u: s.u, kind: s.kind }; }),
    disclaimer: DISCLAIMER,
    model: model
  });
};
