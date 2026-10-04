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

    KB = {
      rights: Array.isArray(global.window.RA_RIGHTS_DETAIL)
        ? global.window.RA_RIGHTS_DETAIL
        : [],

      laws: Array.isArray(global.window.RA_LAWS)
        ? global.window.RA_LAWS
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
      laws: []
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


  return {
    rights: rights,
    laws: laws
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


  return {
    rights: rights,

    laws: laws,

    note:
      "Only use details supplied here. " +
      "Overview, partial, verify, or source-file-supplied " +
      "information must not be presented as independently confirmed."
  };
}


/* =========================================================
   BUILD RESPONSE LINKS
   ========================================================= */

function buildLinks(verifiedContext) {
  const links = [];
  const sources = [];


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
     VERIFIED CALLER (a configured key is only spendable by a
     signed-in account; fail closed)
     --------------------------------------------------------- */

  const acct = await verifiedAccount(req);
  if (!acct) {
    return res.status(401).json({
      ok: false,
      code: "unauthorized",
      error: "Sign in required."
    });
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
    laws: []
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
        DISCLAIMER
    });


  } catch (error) {

    console.error(
      "RIGHTAWARE_AI_ERROR",
      error
    );


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