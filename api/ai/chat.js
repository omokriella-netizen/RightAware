/* RightAware AI — POST /api/ai/chat
   Real AI + Nigerian Pidgin + verified RightAware knowledge base
*/
"use strict";

const DISCLAIMER =
  "General legal information only — not legal advice. Verify important points with a qualified professional.";

const SYSTEM = [
  "You are RightAware AI — the Nigerian civic and legal-awareness assistant inside RightAware.",
  "You explain verified Nigerian rights, laws, civic responsibilities and practical next steps in language ordinary Nigerians can understand.",
  "You are not a generic chatbot and you are not a lawyer.",
  "",
  "LANGUAGE:",
  "- Match the user's language.",
  "- If the user writes Nigerian Pidgin, answer naturally in Nigerian Pidgin.",
  "- If the user mixes Pidgin and English, respond naturally in the same style.",
  "- Understand common expressions such as: wetin be my right, wetin I fit do, police carry me go station, dem arrest me, dem wan throw me out, dem dey threaten me, I no get money.",
  "",
  "LEGAL SAFETY:",
  "- Base legal claims ONLY on the verified CONTEXT supplied with the question.",
  "- Never invent laws, sections, cases, statistics, organisations, contacts or URLs.",
  "- If the supplied verified context does not contain the answer, clearly say that you do not have enough verified information and direct the user to Get Help or the Rights Library.",
  "- Never claim to be a lawyer.",
  "- Give general legal information, not legal advice.",
  "- If someone may be in immediate danger or is under arrest, give practical safety steps first.",
  "- Never ask for or repeat passwords, OTPs, PINs or bank details.",
  "",
  "RESPONSE STYLE:",
  "- Answer the actual question directly.",
  "- Do not start with 'Thanks — based on those words'.",
  "- Do not simply tell the user to search the website when the supplied context contains useful information.",
  "- Use short paragraphs and simple bullet points.",
  "- Keep answers under about 220 words.",
  "- End every answer with exactly:",
  "General legal information only — not legal advice. Verify important points with a qualified professional."
].join("\n");

const RATE_LIMIT = 20;
const RATE_WINDOW = 60000;
const PROVIDER_TIMEOUT = 20000;

const DEFAULT_MODEL = "gpt-6-luna";
const DEFAULT_BASE_URL = "https://api.openai.com/v1/responses";

const FALLBACK_LINKS = [
  { t: "Browse rights library", u: "rights.html" },
  { t: "Get Help", u: "help.html" }
];

let kbCache = null;

function str(v) {
  return v == null
    ? ""
    : Array.isArray(v)
      ? v.join(" ")
      : String(v);
}

function clip(s, n) {
  s = String(s == null ? "" : s);
  return s.length > n ? s.slice(0, n - 3) + "..." : s;
}

/* ---------- verified RightAware knowledge base ---------- */

function kb() {
  if (kbCache) return kbCache;

  const g = globalThis;

  if (typeof g.window === "undefined") {
    g.window = g;
  }

  try {
    require("../../content/rights.js");
  } catch (e) {}

  try {
    require("../../content/laws.js");
  } catch (e) {}

  try {
    require("../../data.js");
  } catch (e) {}

  const w = g.window || g;
  const items = [];

  (w.RA_RIGHTS_DETAIL || []).forEach(function (r) {
    if (!r || !r.title) return;

    const txt =
      String(r.title) +
      ": " +
      str(r.summary) +
      (str(r.keywords)
        ? " Keywords: " + str(r.keywords)
        : "");

    items.push({
      kind: "Rights Library",
      t: String(r.title),
      u: r.fullGuide
        ? String(r.fullGuide)
        : "rights/topic.html?id=" +
          encodeURIComponent(String(r.id || "")),
      txt: txt,
      hay: txt.toLowerCase(),
      tl: String(r.title).toLowerCase()
    });
  });

  (w.RA_LAWS || []).forEach(function (l) {
    if (!l || !l.title) return;

    const txt =
      String(l.title) +
      ": " +
      str(l.description) +
      (str(l.category)
        ? " (" +
          str(l.category) +
          (str(l.docType)
            ? ", " + str(l.docType)
            : "") +
          ")"
        : "");

    items.push({
      kind: "Laws & Legal Documents",
      t: String(l.title),
      u: "laws.html",
      txt: txt,
      hay: txt.toLowerCase(),
      tl: String(l.title).toLowerCase()
    });
  });

  (w.RA_FAQS || []).forEach(function (f) {
    if (!f || !f.q) return;

    const txt =
      String(f.q) + " — " + str(f.a);

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

/* ---------- Nigerian Pidgin query expansion ---------- */

const PIDGIN = [
  [/\bwetin be my right\b/gi, "rights legal rights"],
  [/\bwetin i fit do\b/gi, "what can I do options next steps"],
  [/\bwetin\b/gi, "what"],
  [/\bfit\b/gi, "can"],
  [/\bdey\b/gi, "is are doing"],
  [/\bdem\b/gi, "they"],
  [/\buna\b/gi, "you"],
  [/\bdis\b/gi, "this"],
  [/\bdat\b/gi, "that"],
  [/\bna\b/gi, "is"],
  [/\bwan\b/gi, "want"],
  [/\bno get\b/gi, "do not have"],
  [/\bcarry me go station\b/gi, "arrest detained police station"],
  [/\bcarry me\b/gi, "arrest detained"],
  [/\bpolice carry\b/gi, "police arrest"],
  [/\bdem arrest me\b/gi, "arrest detained"],
  [/\bjail\b/gi, "prison detention arrest"],
  [/\bthrow me out\b/gi, "eviction landlord housing"],
  [/\blandlord\b/gi, "landlord tenancy eviction housing"],
  [/\bthreaten\b/gi, "threat intimidation"],
  [/\bsalary\b/gi, "wages employment unpaid salary"],
  [/\bwork money\b/gi, "employment wages salary"],
  [/\bscam\b/gi, "fraud online scam"],
  [/\bdey mad\b/gi, "insult abuse"]
];

function expandPidgin(s) {
  let q = String(s || "").toLowerCase();

  for (let i = 0; i < PIDGIN.length; i++) {
    q = q.replace(PIDGIN[i][0], " " + PIDGIN[i][1] + " ");
  }

  return q;
}

const STOP = {};

(
  "the a an of and or to in is are my i me can how what do does for with on at be was were this that if it you your about please help there here their they them from into out up down not yes has have had been being will would should could just also any all some more than then when who whom which why"
)
  .split(" ")
  .forEach(function (w) {
    STOP[w] = 1;
  });

function stems(t) {
  const out = [t];

  if (t.length > 4 && /(ed|es|s)$/.test(t)) {
    out.push(t.replace(/(ed|es|s)$/, ""));
  }

  if (t.length > 5 && /ing$/.test(t)) {
    out.push(t.replace(/ing$/, ""));
  }

  return out;
}

function tokens(s) {
  return expandPidgin(s)
    .split(/[^a-z0-9]+/)
    .filter(function (t) {
      return t.length > 2 && !STOP[t];
    });
}

function score(item, ts) {
  let sc = 0;

  for (let i = 0; i < ts.length; i++) {
    const group = stems(ts[i]);
    let titleHit = false;
    let bodyHit = false;

    for (let j = 0; j < group.length; j++) {
      if (item.tl.indexOf(group[j]) >= 0) {
        titleHit = true;
      }

      if (item.hay.indexOf(group[j]) >= 0) {
        bodyHit = true;
      }
    }

    if (titleHit) sc += 4;
    else if (bodyHit) sc += 2;
  }

  return sc;
}

function retrieve(q, items) {
  const ts = tokens(q);

  if (!ts.length) return [];

  return items
    .map(function (item) {
      return {
        it: item,
        sc: score(item, ts)
      };
    })
    .filter(function (x) {
      return x.sc >= 2;
    })
    .sort(function (a, b) {
      return b.sc - a.sc;
    })
    .slice(0, 5)
    .map(function (x) {
      return x.it;
    });
}

function buildContext(srcs) {
  if (!srcs.length) {
    return "(No verified source matched this question. Do not invent an answer.)";
  }

  return srcs
    .map(function (s, i) {
      return (
        "[" +
        (i + 1) +
        "] (" +
        s.kind +
        ") " +
        s.txt
      );
    })
    .join("\n\n")
    .slice(0, 8000);
}

/* ---------- simple rate limit ---------- */

const buckets = Object.create(null);

function rateLimited(ip) {
  const now = Date.now();
  const arr = buckets[ip] || [];

  const keep = arr.filter(function (time) {
    return now - time < RATE_WINDOW;
  });

  if (keep.length >= RATE_LIMIT) {
    buckets[ip] = keep;
    return true;
  }

  keep.push(now);
  buckets[ip] = keep;

  return false;
}

/* ---------- API handler ---------- */

module.exports = async function (req, res) {
  const configured = !!process.env.AI_API_KEY;

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      code: "method",
      error: "POST only.",
      configured: configured
    });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = null;
    }
  }

  body = body || {};

  const message =
    typeof body.message === "string"
      ? body.message.trim()
      : "";

  if (!message || message.length > 2000) {
    return res.status(400).json({
      ok: false,
      code: "bad_request",
      error: "message (1-2000 chars) required."
    });
  }

  const xff =
    req.headers &&
    req.headers["x-forwarded-for"]
      ? String(req.headers["x-forwarded-for"])
          .split(",")[0]
          .trim()
      : "";

  const ip = xff || req.ip || "unknown";

  if (rateLimited(ip)) {
    return res.status(429).json({
      ok: false,
      code: "rate_limited",
      error: "Too many messages. Wait a moment and try again."
    });
  }

  if (!configured) {
    return res.status(501).json({
      ok: false,
      code: "not_configured",
      error:
        "AI not configured. The assistant falls back to labelled library matches.",
      links: FALLBACK_LINKS
    });
  }

  const sources = retrieve(message, kb());

  const pageContext =
    typeof body.context === "string" &&
    body.context
      ? "\n\nPAGE CONTEXT:\n" +
        clip(body.context, 1200)
      : "";

  const userInput =
    "VERIFIED RIGHTAWARE CONTEXT:\n" +
    buildContext(sources) +
    pageContext +
    "\n\nUSER QUESTION:\n" +
    message;

  const base =
    process.env.AI_BASE_URL ||
    DEFAULT_BASE_URL;

  const model =
    process.env.AI_MODEL ||
    DEFAULT_MODEL;

  let raw;

  const controller =
    typeof AbortController === "function"
      ? new AbortController()
      : null;

  const timer = controller
    ? setTimeout(function () {
        try {
          controller.abort();
        } catch (e) {}
      }, PROVIDER_TIMEOUT)
    : null;

  try {
    const response = await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer " + process.env.AI_API_KEY
      },
      body: JSON.stringify({
        model: model,
        instructions: SYSTEM,
        input: userInput,
        max_output_tokens: 900
      }),
      signal: controller
        ? controller.signal
        : undefined
    });

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        code: "provider_error",
        error:
          "AI provider returned status " +
          response.status +
          ".",
        links: FALLBACK_LINKS
      });
    }

    raw = await response.json();
  } catch (e) {
    return res.status(502).json({
      ok: false,
      code: "provider_error",
      error: "AI provider unreachable.",
      links: FALLBACK_LINKS
    });
  } finally {
    if (timer) clearTimeout(timer);
  }

  const text =
    raw && typeof raw.output_text === "string"
      ? raw.output_text
      : "";

  if (!text) {
    return res.status(502).json({
      ok: false,
      code: "provider_error",
      error: "AI provider returned no answer.",
      links: FALLBACK_LINKS
    });
  }

  return res.status(200).json({
    ok: true,
    text: text.trim(),
    links: sources.slice(0, 5).map(function (s) {
      return {
        t: s.t,
        u: s.u
      };
    }),
    sources: sources.slice(0, 5).map(function (s) {
      return {
        t: s.t,
        u: s.u,
        kind: s.kind
      };
    }),
    disclaimer: DISCLAIMER,
    model: model
  });
};