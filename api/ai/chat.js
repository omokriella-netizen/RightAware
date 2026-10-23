"use strict";

/*
 * RIGHTAWARE AI
 * Production Nigerian civic/legal-awareness assistant.
 *
 * Features:
 * - OpenAI Responses API
 * - RightAware knowledge-base grounding
 * - Nigerian Pidgin support
 * - Topic-aware legal source selection
 * - RightAware guide/source links
 * - Verification-aware answers
 * - Safe handling of urgent situations
 *
 * IMPORTANT:
 * The OpenAI API key must remain in Vercel Environment Variables.
 * Never place the API key in this file or frontend JavaScript.
 */

const crypto = require("crypto");

const DISCLAIMER =
  "General legal information only — not legal advice. Verify important points with a qualified professional.";

const MODEL =
  process.env.AI_MODEL || "gpt-6-luna";

const API_URL =
  process.env.AI_BASE_URL ||
  "https://api.openai.com/v1/responses";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_PAGE_CONTEXT_LENGTH = 3000;
const MAX_OUTPUT_TOKENS = 900;


/* =========================================================
   RIGHTAWARE SYSTEM INSTRUCTIONS
   ========================================================= */

const SYSTEM = `
You are RightAware AI, the Nigerian civic and legal-awareness assistant inside RightAware.

Your purpose is to help Nigerians understand:
- their legal rights,
- civic responsibilities,
- Nigerian laws and legal documents,
- practical next steps,
- where relevant RightAware resources can help.

You are NOT a lawyer and you do NOT provide legal advice.

CORE RULES:

1. Use the RIGHTAWARE VERIFIED CONTEXT supplied with each question as your primary source.

2. Never invent:
- Nigerian laws
- constitutional sections
- cases
- statistics
- organisations
- phone numbers
- email addresses
- URLs
- legal procedures
- penalties
- deadlines

3. Do not mention a law simply because its name appears in the context.
Only mention a law when it is actually relevant to the user's question.

4. If information is marked:
- "verify"
- "source-file-supplied"
- "overview"
- "partial"
- or otherwise indicates that confirmation is required

do NOT present that information as independently confirmed.
Tell the user that verification may be necessary.

5. If the supplied RightAware context does not contain enough information,
say so clearly instead of guessing.

6. Answer the user's actual question directly.
Do not begin with generic phrases such as:
"Thanks — based on those words..."

7. Keep answers clear and practical.
Use short paragraphs and bullet points where helpful.

8. If the user writes Nigerian Pidgin, respond naturally in Nigerian Pidgin.

9. If the user mixes Nigerian Pidgin and English, follow the user's style naturally.

10. If the user describes immediate danger, threats, violence or an active arrest,
give practical safety guidance first.

11. Never ask for:
- passwords
- PINs
- OTPs
- bank details
- card details
- security answers

12. Do not claim to be a lawyer or legal professional.

13. Do not overstate certainty.

14. When a relevant RightAware guide exists, mention it naturally.
When the context includes organisations from the rights-protection agency
directory, you may refer the user to them for such questions — repeat only
the phone, email, website and directory-page details supplied for that
organisation, exactly as given, and never a contact detail that is not in
the context. Their listing reproduces published details and is not
verified by RightAware.

15. Do not dump unrelated laws or resources into the answer.

16. Where a legal source has not been independently verified by RightAware,
make that limitation clear.

17. Keep the response reasonably concise and useful.

18. End every answer with exactly:

General legal information only — not legal advice. Verify important points with a qualified professional.
`;


/* =========================================================
   RESPONSE TEXT EXTRACTION
   =========================================================

   OpenAI Responses API responses can contain generated text inside:
   - output_text
   - output[].content[].text

   We support both so the endpoint does not depend on one
   response representation.
   ========================================================= */

function extractResponseText(data) {
  /* SDK-style / convenience field */
  if (
    data &&
    typeof data.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  /* Raw Responses API structure */
  if (data && Array.isArray(data.output)) {
    const pieces = [];

    for (const item of data.output) {
      if (!item || !Array.isArray(item.content)) {
        continue;
      }

      for (const part of item.content) {
        if (
          part &&
          typeof part.text === "string" &&
          part.text.trim()
        ) {
          pieces.push(part.text.trim());
        }
      }
    }

    if (pieces.length) {
      return pieces.join("\n").trim();
    }
  }

  /* Defensive fallback */
  if (
    data &&
    data.message &&
    Array.isArray(data.message.content)
  ) {
    const pieces = [];

    for (const part of data.message.content) {
      if (
        part &&
        typeof part.text === "string" &&
        part.text.trim()
      ) {
        pieces.push(part.text.trim());
      }
    }

    if (pieces.length) {
      return pieces.join("\n").trim();
    }
  }

  return "";
}


/* =========================================================
   RIGHTAWARE KNOWLEDGE BASE
   ========================================================= */

let KB = null;

function loadKnowledgeBase() {
  if (KB) {
    return KB;
  }

  try {
    /*
     * These are the existing RightAware knowledge files.
     * They are loaded server-side and are never exposed with
     * the API key.
     */

    if (!global.window) {
      global.window = {};
    }

    require("../../content/rights.js");
    require("../../content/laws.js");
    require("../../content/organizations.js");

    KB = {
      rights: Array.isArray(global.window.RA_RIGHTS_DETAIL)
        ? global.window.RA_RIGHTS_DETAIL
        : [],

      laws: Array.isArray(global.window.RA_LAWS)
        ? global.window.RA_LAWS
        : [],

      orgs: Array.isArray(global.window.RA_ORGANIZATIONS)
        ? global.window.RA_ORGANIZATIONS
        : []
    };

    return KB;

  } catch (error) {
    /*
     * Do not crash the entire AI endpoint if a knowledge file
     * has a problem. The AI can still operate, but the system
     * prompt will tell it not to invent information.
     */

    console.error(
      "RIGHTAWARE_KB_LOAD_ERROR",
      error
    );

    KB = {
      rights: [],
      laws: [],
      orgs: []
    };

    return KB;
  }
}


/* =========================================================
   TEXT HELPERS
   ========================================================= */

function words(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(function (word) {
      return word.length >= 3;
    });
}


function containsAny(text, terms) {
  const q = String(text || "").toLowerCase();

  return terms.some(function (term) {
    return q.includes(term);
  });
}


/* =========================================================
   PIDGIN / NATURAL LANGUAGE EXPANSION
   =========================================================

   The model already understands Nigerian Pidgin.
   These expansions mainly help RightAware retrieve the
   correct internal knowledge before sending the question.
   ========================================================= */

function expandPidgin(message) {
  let q = String(message || "").toLowerCase();

  const replacements = [
    [/\bwetin be my right\b/g, "what are my legal rights"],
    [/\bwetin i fit do\b/g, "what can I do next steps"],
    [/\bwetin\b/g, "what"],
    [/\bfit\b/g, "can"],
    [/\bdey\b/g, "is are doing"],
    [/\bdem\b/g, "they"],
    [/\buna\b/g, "you"],
    [/\bdis\b/g, "this"],
    [/\bdat\b/g, "that"],
    [/\bna\b/g, "is"],
    [/\bwan\b/g, "want"],
    [/\bno get\b/g, "do not have"],
    [/\bcarry me go station\b/g, "police arrest detained station"],
    [/\bcarry me\b/g, "arrest detained"],
    [/\bpolice carry\b/g, "police arrest"],
    [/\bdem arrest me\b/g, "they arrested me"],
    [/\bjail\b/g, "prison detention arrest"],
    [/\bthrow me out\b/g, "eviction landlord housing"],
    [/\bdey threaten me\b/g, "threat intimidation"],
    [/\bthreaten\b/g, "threat intimidation"],
    [/\bsalary\b/g, "wages employment unpaid salary"],
    [/\bwork money\b/g, "employment wages salary"],
    [/\bscam\b/g, "fraud online scam"],
    [/\bdey mad\b/g, "insult abuse"]
  ];

  for (const pair of replacements) {
    q = q.replace(pair[0], " " + pair[1] + " ");
  }

  return q;
}


/* =========================================================
   KNOWLEDGE SCORING
   ========================================================= */

function scoreItem(queryWords, item) {
  const text = [
    item.id,
    item.title,
    item.summary,
    item.description,
    item.keywords,
    item.category,
    item.legalBasis && item.legalBasis.text
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const word of queryWords) {
    if (text.includes(word)) {
      /*
       * Longer words are more meaningful.
       */
      score += word.length >= 5 ? 2 : 1;
    }
  }

  return score;
}


/* =========================================================
   TOPIC-AWARE KNOWLEDGE RETRIEVAL
   ========================================================= */

function findKnowledge(message) {
  const kb = loadKnowledgeBase();

  const expandedMessage =
    expandPidgin(message);

  const queryWords =
    words(expandedMessage);


  /* ---------------------------------------------------------
     RIGHTS
     --------------------------------------------------------- */

  const rights = kb.rights
    .map(function (item) {
      return {
        item: item,
        score: scoreItem(queryWords, item)
      };
    })
    .filter(function (x) {
      return x.score > 0;
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .slice(0, 4)
    .map(function (x) {
      return x.item;
    });


  /* ---------------------------------------------------------
     LEGAL SOURCE PRIORITY

     This is important.

     Generic keyword matching can accidentally attach
     unrelated laws. These topic rules prevent that.
     --------------------------------------------------------- */

  let preferredIds = [];


  /* POLICE / ARREST / DETENTION */
  if (
    containsAny(expandedMessage, [
      "police",
      "arrest",
      "arrested",
      "detain",
      "detention",
      "bail",
      "custody",
      "station",
      "officer",
      "confession",
      "search",
      "police station"
    ])
  ) {
    preferredIds = [
      "constitution-1999",
      "acja-2015"
    ];
  }


  /* CHILDREN */
  else if (
    containsAny(expandedMessage, [
      "child",
      "children",
      "minor",
      "juvenile",
      "under 18"
    ])
  ) {
    preferredIds = [
      "child-rights-act-2003",
      "constitution-1999"
    ];
  }


  /* ELECTIONS */
  else if (
    containsAny(expandedMessage, [
      "election",
      "electoral",
      "vote",
      "voting",
      "polling",
      "candidate",
      "ballot",
      "inec",
      "political party"
    ])
  ) {
    preferredIds = [
      "electoral-act-2022",
      "constitution-1999"
    ];
  }


  /* TENANCY */
  else if (
    containsAny(expandedMessage, [
      "rent",
      "tenant",
      "landlord",
      "tenancy",
      "eviction",
      "house rent",
      "housing"
    ])
  ) {
    preferredIds = [
      "tenancy-law-2011",
      "constitution-1999"
    ];
  }


  /* EMPLOYMENT */
  else if (
    containsAny(expandedMessage, [
      "salary",
      "wages",
      "employer",
      "employee",
      "employment",
      "workplace",
      "job",
      "dismissed",
      "fired"
    ])
  ) {
    preferredIds = [
      "constitution-1999"
    ];
  }


  /* ---------------------------------------------------------
     SELECT PREFERRED LAWS
     --------------------------------------------------------- */

  let laws = [];

  if (preferredIds.length) {
    laws = preferredIds
      .map(function (id) {
        return kb.laws.find(function (law) {
          return law.id === id;
        });
      })
      .filter(Boolean);
  }


  /* ---------------------------------------------------------
     GENERAL FALLBACK

     Only use keyword matching when no specific topic was
     identified.
     --------------------------------------------------------- */

  if (!laws.length) {
    laws = kb.laws
      .map(function (item) {
        return {
          item: item,
          score: scoreItem(queryWords, item)
        };
      })
      .filter(function (x) {
        return x.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 2)
      .map(function (x) {
        return x.item;
      });
  }


  /* ---------------------------------------------------------
     ORGANISATIONS (rights-protection agency directory)

     Uses the shared ranker from content/organizations.js so the
     AI sees the same organisations the site search ranks: exact
     names, problem wording and location all score. Retrieval is
     best-effort — a problem here must never break the endpoint.
     --------------------------------------------------------- */

  let orgs = [];

  try {
    if (
      global.window &&
      typeof global.window.RA_ORG_RANK === "function"
    ) {
      orgs = global.window
        .RA_ORG_RANK(expandedMessage, kb.orgs)
        .slice(0, 5)
        .map(function (x) {
          return x.org;
        });
    }
  } catch (_) {
    orgs = [];
  }


  return {
    rights: rights,
    laws: laws,
    orgs: orgs
  };
}


/* =========================================================
   BUILD VERIFIED CONTEXT
   ========================================================= */

function makeContext(message) {
  const found =
    findKnowledge(message);


  const rights =
    found.rights.map(function (r) {
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        summary: r.summary,

        explanation:
          Array.isArray(r.explanation)
            ? r.explanation.slice(0, 3)
            : [],

        legalBasis:
          r.legalBasis || null,

        meaning:
          Array.isArray(r.meaning)
            ? r.meaning.slice(0, 5)
            : [],

        canDo:
          Array.isArray(r.canDo)
            ? r.canDo.slice(0, 5)
            : [],

        avoid:
          Array.isArray(r.avoid)
            ? r.avoid.slice(0, 4)
            : [],

        faqs:
          Array.isArray(r.faqs)
            ? r.faqs.slice(0, 3)
            : [],

        fullGuide:
          r.fullGuide || null,

        sources:
          Array.isArray(r.sources)
            ? r.sources.slice(0, 4)
            : []
      };
    });


  const laws =
    found.laws.map(function (l) {
      return {
        id: l.id,
        title: l.title,
        category: l.category,
        docType: l.docType,
        jurisdiction: l.jurisdiction,
        description: l.description,
        yearNote: l.yearNote,
        status: l.status,
        file: l.file,
        textAvailable: !!l.textAvailable,
        verification:
          l.verification || null
      };
    });


  const orgs =
    (found.orgs || []).map(function (o) {
      return {
        id: o.id,
        name: o.name,
        acronym: o.acronym || null,
        type: o.type,
        country: o.country,
        state: o.state || null,
        location: o.location,
        coverage: o.coverage,
        specialization: o.specialization,
        rights_areas: o.rights_areas || [],
        services: o.services || [],
        who_they_help: o.who_they_help,
        phone: o.phone || null,
        email: o.email || null,
        website: o.website || null,
        directory_url: o.directory_url || null,
        source: o.source || null,
        source_url: o.source_url || null,
        last_verified_at: o.last_verified_at || null,
        verification: o.verification || null
      };
    });


  return {
    rights: rights,

    laws: laws,

    orgs: orgs,

    note:
      "Only use details supplied here. " +
      "Overview, partial, verify, or source-file-supplied " +
      "information must not be presented as independently confirmed. " +
      "Organisation contacts must be repeated exactly as supplied " +
      "(including null when null); never invent or guess a phone, " +
      "email, website or address. Organisation listings reproduce " +
      "published directory details and are not verified by RightAware."
  };
}


/* =========================================================
   BUILD RESPONSE LINKS
   ========================================================= */

function buildLinks(verifiedContext) {
  const links = [];
  const sources = [];


  /*
   * Organisation profiles first: for referral questions the record
   * the user can open (contacts, hours, source) is the most useful
   * link. Dedup and the slice(0, 6) cap below are unchanged.
   */
  for (
    const o of verifiedContext.orgs || []
  ) {
    if (o && o.id) {
      links.push({
        t: "RightAware: " + (o.name || "Organisation profile"),
        u:
          "organizations.html?id=" +
          encodeURIComponent(o.id)
      });
    }
  }


  for (
    const r of verifiedContext.rights || []
  ) {
    if (r.fullGuide) {
      links.push({
        t: "RightAware: " + r.title,
        u: r.fullGuide
      });
    }

    else if (r.title && r.id) {
      links.push({
        t: "RightAware: " + r.title,
        u:
          "rights/topic.html?id=" +
          encodeURIComponent(r.id)
      });
    }


    for (
      const source of r.sources || []
    ) {
      const sourceText =
        String(source);

      /*
       * Do not expose internal verification
       * instructions as if they were sources.
       */
      if (
        sourceText
          .toUpperCase()
          .startsWith("VERIFY:")
      ) {
        continue;
      }

      sources.push(sourceText);
    }
  }


  for (
    const law of verifiedContext.laws || []
  ) {
    if (law.id) {
      links.push({
        t: "Law: " + law.title,
        u: "laws.html"
      });
    }
  }


  /*
   * Remove duplicate links.
   */
  const uniqueLinks = [];
  const seenLinks = new Set();

  for (const link of links) {
    const key =
      String(link.t) +
      "|" +
      String(link.u);

    if (!seenLinks.has(key)) {
      seenLinks.add(key);
      uniqueLinks.push(link);
    }
  }


  return {
    links: uniqueLinks.slice(0, 6),
    sources: [
      ...new Set(sources)
    ].slice(0, 6)
  };
}


/* ---------- best-effort in-memory rate limit (per instance) ---------- */
const RATE_LIMIT = 20;          // messages per IP per 60s
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

const FALLBACK_LINKS = [{ t: "Browse rights library", u: "rights.html" }, { t: "Get Help", u: "help.html" }];

/* ---------- verified caller (server-side Supabase JWT check, fail closed) ---------- */
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
      if (!u || !u.id) return null;
      return { id: String(u.id) };
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch(_) { return null; }
}

/* ---------- Guest Quota & Device Verification Utilities ---------- */
function getClientIp(req) {
  const fwd = (req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"])) || "";
  const ip = String(Array.isArray(fwd) ? fwd[0] : fwd).split(",")[0].trim();
  return ip || "127.0.0.1";
}

function getIpSubnet(ip) {
  if (!ip) return null;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 3) return `${parts[0]}:${parts[1]}:${parts[2]}::/48`;
  }
  return null;
}

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader || typeof cookieHeader !== "string") return list;
  cookieHeader.split(";").forEach(function(cookie){
    const parts = cookie.split("=");
    const name = parts.shift().trim();
    if (name) list[name] = decodeURIComponent(parts.join("=").trim());
  });
  return list;
}

function signGuestId(id, secret) {
  return crypto.createHmac("sha256", secret).update(id).digest("hex");
}

function verifyGuestCookie(val, secret) {
  if (!val || typeof val !== "string" || !val.includes(".")) return null;
  const parts = val.split(".");
  const id = parts[0];
  const sig = parts[1];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const expectedSig = signGuestId(id, secret);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return id;
  } catch(_) {}
  return null;
}

function serializeGuestCookie(id, secret, isSecure) {
  const sig = signGuestId(id, secret);
  const val = encodeURIComponent(id + "." + sig);
  const secureFlag = isSecure ? "; Secure" : "";
  return "ra_guest_token=" + val + "; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax" + secureFlag;
}

async function verifyTurnstile(token, clientIp, secret) {
  if (!secret) return { ok: true };
  if (!token) return { ok: false, error: "Missing Turnstile token" };
  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);
    if (clientIp) params.append("remoteip", clientIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const outcome = await res.json();
    return { ok: !!outcome.success, error: (outcome["error-codes"] || []).join(", ") };
  } catch(e) {
    console.error("[TURNSTILE_VERIFY_ERROR]", e);
    return { ok: false, error: e.message };
  }
}

async function callSupabaseRpc(functionName, params) {
  try {
    const base = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!base || !serviceKey) return null;
    const res = await fetch(base + "/rest/v1/rpc/" + functionName, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": "Bearer " + serviceKey
      },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[RA_RPC_WARN]", functionName, res.status, errText);
      return null;
    }
    return await res.json();
  } catch(err) {
    console.warn("[RA_RPC_EXCEPTION]", functionName, err);
    return null;
  }
}


/* =========================================================
   API ENDPOINT
   ========================================================= */

module.exports = async function (req, res) {

  /* ---------------------------------------------------------
     METHOD
     --------------------------------------------------------- */

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      code: "method",
      error: "POST only."
    });
  }


  /* ---------------------------------------------------------
     API KEY
     --------------------------------------------------------- */

  const apiKey =
    process.env.AI_API_KEY;




  /* ---------------------------------------------------------
     REQUEST BODY
     --------------------------------------------------------- */

  let body =
    req.body;


  if (typeof body === "string") {
    try {
      body =
        JSON.parse(body);
    }

    catch (_) {
      return res.status(400).json({
        ok: false,
        code: "bad_request",
        error:
          "Invalid JSON request."
      });
    }
  }


  body =
    body || {};


  const message =
    typeof body.message === "string"
      ? body.message.trim()
      : "";


  if (!message) {
    return res.status(400).json({
      ok: false,
      code: "bad_request",
      error:
        "Please provide a message."
    });
  }


  if (
    message.length >
    MAX_MESSAGE_LENGTH
  ) {
    return res.status(400).json({
      ok: false,
      code: "bad_request",
      error:
        "Message is too long."
    });
  }


  /* ---------------------------------------------------------
     RATE LIMIT (best effort, per instance)
     --------------------------------------------------------- */

  const xff = req.headers && req.headers["x-forwarded-for"] ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : "";
  const ip = req.ip || xff || "unknown";

  if (rateLimited(ip)) {
    return res.status(429).json({
      ok: false,
      code: "rate_limited",
      error: "Too many messages. Wait a moment and try again."
    });
  }


  /* ---------------------------------------------------------
     AI KEY (unconfigured contract: 501 + fallback links.
     Client latch: js/ai.js stops calling and shows the
     labelled library fallback.)
     --------------------------------------------------------- */

  if (!apiKey) {
    return res.status(501).json({
      ok: false,
      code: "not_configured",
      diagnostic: true,
      error: "AI_API_KEY is not available to this Production deployment.",
      text: "RightAware AI connection diagnostic:\n\n" +
        "AI_API_KEY is not available to this Production deployment.",
      links: FALLBACK_LINKS,
      disclaimer: DISCLAIMER
    });
  }


  /* ---------------------------------------------------------
     CALLER VERIFICATION: Authenticated User vs. Verified Guest
     - Signed-in account: Unlimited tier (verified via Supabase JWT)
     - Guest caller: Enforce Turnstile + signed HttpOnly cookie +
       atomic 3-attempt quota per 24h via increment_guest_quota
     --------------------------------------------------------- */

  const acct = await verifiedAccount(req);
  let isGuest = false;
  let guestId = null;
  let guestQuota = null;

  if (!acct) {
    isGuest = true;
    const clientIp = getClientIp(req);
    const ipSubnet = getIpSubnet(clientIp);

    // 1. Enforce Cloudflare Turnstile Verification (Proof of Human Execution)
    const turnstileToken = body.turnstileToken || (req.headers && req.headers["x-turnstile-token"]);
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!turnstileToken) {
        return res.status(403).json({
          ok: false,
          code: "captcha_required",
          error: "Security verification required. Please complete the CAPTCHA."
        });
      }
      const verifyRes = await verifyTurnstile(turnstileToken, clientIp, turnstileSecret);
      if (!verifyRes.ok) {
        return res.status(403).json({
          ok: false,
          code: "captcha_invalid",
          error: "Security verification failed. Please try again."
        });
      }
    }

    // 2. Cookie Device Identification (HMAC-SHA256 Signed Cookie)
    const hmacSecret = process.env.GUEST_HMAC_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hmacSecret) {
      console.error("[RA_GUEST_AUTH_CONFIG_ERROR] Neither GUEST_HMAC_SECRET nor SUPABASE_SERVICE_ROLE_KEY configured.");
      return res.status(503).json({
        ok: false,
        code: "service_unavailable",
        error: "Guest preview service is temporarily unavailable due to server configuration. Please sign in or try again shortly.",
        text: "Guest preview service is temporarily unavailable. Please sign in with a free account to continue without interruption.",
        links: [
          { t: "Sign In", u: "login.html?next=ai.html" },
          { t: "Create Free Account", u: "signup.html" }
        ],
        disclaimer: DISCLAIMER
      });
    }

    const cookies = parseCookies(req.headers ? req.headers.cookie : "");
    guestId = verifyGuestCookie(cookies.ra_guest_token, hmacSecret);
    let needSetCookie = false;
    if (!guestId) {
      guestId = crypto.randomUUID();
      needSetCookie = true;
    }
    if (needSetCookie) {
      const isSecure = (req.headers && req.headers["x-forwarded-proto"] === "https") || process.env.NODE_ENV === "production" || !!process.env.VERCEL;
      res.setHeader("Set-Cookie", serializeGuestCookie(guestId, hmacSecret, isSecure));
    }

    // 3. Atomic Database Quota Mutation via Supabase RPC
    const rpcRes = await callSupabaseRpc("increment_guest_quota", {
      p_guest_id: guestId,
      p_ip_subnet: ipSubnet
    });

    if (rpcRes && Array.isArray(rpcRes) && rpcRes.length > 0) {
      guestQuota = rpcRes[0];
      if (guestQuota.status_code === "subnet_burst_limit") {
        return res.status(429).json({
          ok: false,
          code: "too_many_requests",
          error: "High network activity detected. Please wait a moment or sign in."
        });
      }
      if (!guestQuota.allowed || (guestQuota.current_attempts != null && guestQuota.current_attempts > 3)) {
        return res.status(403).json({
          ok: false,
          code: "free_limit_reached",
          attempts: guestQuota.current_attempts || 4,
          max: 3,
          error: "Free preview limit reached (3/3). Sign in with a free account to continue asking unlimited questions.",
          text: "Free preview limit reached (3/3). Please sign in with a free RightAware account to continue where you left off with unlimited answers.",
          links: [
            { t: "Sign In & Continue", u: "login.html?next=ai.html" },
            { t: "Create Free Account", u: "signup.html" }
          ],
          disclaimer: DISCLAIMER
        });
      }
    } else {
      console.error("[RA_GUEST_QUOTA_ERROR] Supabase RPC failed or returned empty payload");
      return res.status(503).json({
        ok: false,
        code: "service_unavailable",
        error: "Guest preview verification is temporarily unavailable. Please sign in or try again shortly.",
        text: "Guest preview verification is temporarily unavailable. Please sign in with a free account to continue without interruption.",
        links: [
          { t: "Sign In", u: "login.html?next=ai.html" },
          { t: "Create Free Account", u: "signup.html" }
        ],
        disclaimer: DISCLAIMER
      });
    }
  }


  /* ---------------------------------------------------------
     OPTIONAL PAGE CONTEXT
     --------------------------------------------------------- */

  const pageContext =
    typeof body.context === "string" &&
    body.context.trim()

      ? "\n\nRIGHTAWARE PAGE CONTEXT:\n" +
        body.context.slice(
          0,
          MAX_PAGE_CONTEXT_LENGTH
        )

      : "";


  /* ---------------------------------------------------------
     RETRIEVE RIGHTAWARE CONTEXT
     --------------------------------------------------------- */

  let verifiedContext = {
    rights: [],
    laws: [],
    orgs: []
  };


  try {
    verifiedContext =
      makeContext(message);
  }

  catch (error) {
    /*
     * Knowledge retrieval must never crash
     * the AI endpoint.
     */

    console.error(
      "RIGHTAWARE_CONTEXT_ERROR",
      error
    );
  }


  /* ---------------------------------------------------------
     FINAL MODEL INPUT
     --------------------------------------------------------- */

  const input =
    "USER QUESTION:\n" +
    message +

    pageContext +

    "\n\nRIGHTAWARE VERIFIED CONTEXT:\n" +
    JSON.stringify(
      verifiedContext
    );


  /* ---------------------------------------------------------
     OPENAI REQUEST
     --------------------------------------------------------- */

  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              "Bearer " + apiKey
          },

          body:
            JSON.stringify({
              model:
                MODEL,

              instructions:
                SYSTEM,

              input:
                input,

              max_output_tokens:
                MAX_OUTPUT_TOKENS
            })
        }
      );


    /* -------------------------------------------------------
       READ PROVIDER RESPONSE
       ------------------------------------------------------- */

    const providerText =
      await response.text();


    let providerData =
      null;


    try {
      providerData =
        JSON.parse(
          providerText
        );
    }

    catch (_) {
      providerData =
        null;
    }


    /* -------------------------------------------------------
       PROVIDER ERROR
       ------------------------------------------------------- */

    if (!response.ok) {

      const providerMessage =
        providerData &&
        providerData.error &&
        providerData.error.message

          ? String(
              providerData
                .error
                .message
            )

          : providerText

            ? providerText.slice(
                0,
                500
              )

            : "No provider error message.";


      console.error(
        "RIGHTAWARE_OPENAI_ERROR",
        response.status,
        providerMessage
      );

      // Refund guest quota attempt if upstream provider fails
      if (isGuest && guestId) {
        try {
          await callSupabaseRpc("refund_guest_quota", { p_guest_id: guestId });
        } catch (_) {}
      }

      /*
       * Return a diagnostic to the existing frontend
       * rather than exposing the raw provider response.
       */

      return res.status(200).json({
        ok: false,
        diagnostic: true,

        text:
          "RightAware AI connection diagnostic:\n\n" +
          "OpenAI status: " +
          response.status +
          "\n\n" +
          "The AI provider could not complete the request. Details are recorded in the server log.",

        disclaimer:
          "Temporary technical diagnostic."
      });
    }


    /* -------------------------------------------------------
       EXTRACT GENERATED ANSWER
       ------------------------------------------------------- */

    const answer =
      extractResponseText(
        providerData
      );


    if (!answer) {

      console.error(
        "RIGHTAWARE_OPENAI_UNREADABLE_RESPONSE",
        JSON.stringify(
          providerData
        ).slice(
          0,
          5000
        )
      );

      // Refund guest quota if unreadable
      if (isGuest && guestId) {
        try {
          await callSupabaseRpc("refund_guest_quota", { p_guest_id: guestId });
        } catch (_) {}
      }

      return res.status(200).json({
        ok: false,
        diagnostic: true,

        text:
          "RightAware AI connection diagnostic:\n\n" +
          "OpenAI accepted the request, but RightAware could not extract the generated answer.",

        disclaimer:
          "Temporary technical diagnostic."
      });
    }


    /* -------------------------------------------------------
       BUILD RIGHTAWARE LINKS + SOURCES
       ------------------------------------------------------- */

    const resourceData =
      buildLinks(
        verifiedContext
      );


    /* -------------------------------------------------------
       SUCCESS
       ------------------------------------------------------- */

    return res.status(200).json({

      ok: true,

      text:
        answer,

      links:
        resourceData.links,

      sources:
        resourceData.sources,

      disclaimer:
        DISCLAIMER,

      isGuest: isGuest,
      guestAttempts: guestQuota ? guestQuota.current_attempts : undefined,
      guestMax: isGuest ? 3 : undefined
    });


  } catch (error) {

    console.error(
      "RIGHTAWARE_AI_ERROR",
      error
    );

    // Refund guest quota on network / unhandled exceptions
    if (isGuest && guestId) {
      try {
        await callSupabaseRpc("refund_guest_quota", { p_guest_id: guestId });
      } catch (_) {}
    }

    return res.status(200).json({
      ok: false,
      diagnostic: true,

      text:
        "RightAware AI connection diagnostic:\n\n" +
        "Unexpected error while contacting the AI provider. Details are recorded in the server log.",

      disclaimer:
        "Temporary technical diagnostic."
    });
  }
};