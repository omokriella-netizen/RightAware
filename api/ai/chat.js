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

/* =========================================================
   PROVIDER & MODEL RESOLUTION
   - Supports Google Gemini (OpenAI-compatible & direct)
   - Supports OpenAI (default)
   - Auto-normalizes trailing /openai or /v1 endpoints
   ========================================================= */

function resolveAiConfig(apiKey) {
  const envModel = (process.env.AI_MODEL || "").trim();
  const envBaseUrl = (process.env.AI_BASE_URL || "").trim();

  // Detect Gemini provider from API key format (AIza...) or model name
  const isGeminiKey = typeof apiKey === "string" && apiKey.startsWith("AIza");
  const isGeminiModel = envModel.toLowerCase().startsWith("gemini");
  const isGemini = isGeminiKey || isGeminiModel;

  // Resolve active model (Google Gemini latest active model is gemini-3.8-flash)
  let model = envModel;
  if (!model) {
    model = isGemini ? "gemini-3.8-flash" : "gpt-4o-mini";
  } else if (isGemini) {
    const lower = model.toLowerCase();
    if (
      lower === "gemini-1.5-flash" ||
      lower === "gemini-1.5-pro" ||
      lower === "gemini-2.0-flash" ||
      lower === "gemini-2.5-flash" ||
      lower === "gemini-2.5-pro" ||
      lower === "gemini-1.0-pro" ||
      lower === "gemini-3.7-flash"
    ) {
      model = "gemini-3.8-flash";
    }
  }

  // Resolve API URL
  let apiUrl = envBaseUrl;
  if (!apiUrl) {
    if (isGemini) {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    } else {
      apiUrl = "https://api.openai.com/v1/chat/completions";
    }
  } else {
    // Gracefully handle standard SDK baseURL formats (e.g. ".../v1beta/openai" or ".../v1")
    const stripped = apiUrl.replace(/\/+$/, "");
    if (stripped.endsWith("/openai") || stripped.endsWith("/v1")) {
      apiUrl = stripped + "/chat/completions";
    }
  }

  return { model, apiUrl, isGemini };
}

/* =========================================================
   RESILIENT MODEL CASCADE & CIRCUIT BREAKER
   ========================================================= */

const MODEL_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown for degraded models
const modelCooldowns = new Map(); // Map<string, number> (model -> timestamp when cooldown ends)

function getCandidateModels(primaryModel, isGemini) {
  if (!isGemini) {
    const list = [primaryModel];
    if (primaryModel === "gpt-4o-mini") list.push("gpt-4o");
    else if (primaryModel === "gpt-4o") list.push("gpt-4o-mini");
    return list;
  }

  // Gemini candidate priority cascade:
  // 1. primaryModel (e.g. gemini-3.8-flash)
  // 2. gemini-3.5-flash-lite (Google designated high-throughput low-latency model)
  // 3. gemini-3.1-flash-lite (high-availability backup)
  // 4. gemini-3.8-flash (if not primary)
  const rawList = [
    primaryModel,
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash"
  ];

  // Filter out duplicates and retired/deprecated models (1.0, 1.5, 2.0, 2.5, 3.7)
  const unique = [];
  const seen = new Set();
  for (const m of rawList) {
    if (!m) continue;
    const lower = m.toLowerCase();
    if (
      lower.includes("1.0") ||
      lower.includes("1.5") ||
      lower.includes("2.0") ||
      lower.includes("2.5") ||
      lower.includes("3.7")
    ) {
      continue;
    }
    if (!seen.has(m)) {
      seen.add(m);
      unique.push(m);
    }
  }

  // Circuit Breaker Sorting:
  // If a model is currently in cooldown (e.g. returned 503 high demand recently),
  // route new requests immediately to healthy models first to avoid stalls.
  const now = Date.now();
  const healthy = unique.filter(m => (modelCooldowns.get(m) || 0) < now);
  const degraded = unique.filter(m => (modelCooldowns.get(m) || 0) >= now);

  return healthy.length > 0 ? [...healthy, ...degraded] : unique;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_PAGE_CONTEXT_LENGTH = 3000;
const MAX_DEFAULT_OUTPUT_TOKENS = 500;

/* =========================================================
   PLATFORM GROUNDING & CIVIC IDENTITY
   ========================================================= */

const PLATFORM_INFO = {
  name: "RightAware",
  tagline: "Translating Nigerian constitutional and statutory law into plain, accessible civic power.",
  nature: "Independent Nigerian civic-tech platform. NOT a law firm, NOT a court, NOT a government agency. Provides free public legal information and verified referrals, not private legal representation.",
  access: "100% free public access, NDPR privacy-compliant, zero tracking.",
  keyFeatures: [
    { title: "28 Rights Topics", url: "rights.html", desc: "Plain-language guides covering fundamental rights in Chapter IV 1999 Constitution (police stops, bail, fair hearing, tenancy, consumer protection, freedom of expression, etc.)." },
    { title: "Laws & Statutes Library", url: "laws.html", desc: "Searchable authentic Nigerian statutes, gazettes, and acts (Constitution 1999, Electoral Act 2022, ACJA 2015, Cybercrime Act, Marriage Act, etc.)." },
    { title: "Organizations Directory", url: "organizations.html", desc: "Verified directory of public complaint commissions, human rights desks, and statutory ombudsmen." },
    { title: "Legal Professionals", url: "lawyers.html", desc: "Verified directory of accredited legal practitioners and university legal aid clinics." },
    { title: "Emergency Console & Helplines", url: "help.html", desc: "Fast access to Police CRU (0805 700 0001), National Emergency (112), Legal Aid Council, and NHRC." },
    { title: "Printable Checklists", url: "printables.html", desc: "Pocket-sized offline legal handbooks and emergency guides for low-connectivity environments." },
    { title: "Civic Video Guides", url: "videos.html", desc: "Visual guides explaining legal rights in clear English and Nigerian Pidgin." }
  ]
};

/* =========================================================
   DETERMINISTIC FAST-PATH GREETINGS (ZERO TOKEN DRAIN)
   ========================================================= */

const GREETING_RESPONSES = [
  "Welcome to RightAware. I am here to help you understand your civic rights under Nigerian law, explore verified statutes, or learn more about the platform. How can I help you today?",
  "Hello. I am RightAware AI, your Nigerian civic and legal awareness companion. Feel free to ask about your constitutional rights, tenant laws, police rules, or how to navigate RightAware.",
  "Good day. Welcome to RightAware. You can ask me questions about Nigerian laws, your rights as a citizen, or our verified legal guides. What would you like to explore?"
];

function pickGreeting() {
  return GREETING_RESPONSES[Date.now() % GREETING_RESPONSES.length];
}

/* =========================================================
   INTENT CLASSIFICATION ENGINE (3-TIER PRIORITY CASCADE)
   ========================================================= */

/* =========================================================
   INTENT CLASSIFICATION ENGINE
   - INTENT_GREETING_CASUAL: Sub-5ms server-local fast-path
   - INTENT_PLATFORM_INQUIRY: RightAware platform tools & identity
   - INTENT_EXPLAIN_LAW: ONLY for explicit requests to explain a law/right (uses analogies & examples)
   - INTENT_PRACTICAL_GUIDANCE: Practical disputes, checkpoints, violations, crimes (step-by-step guidelines, NO analogies)
   ========================================================= */

const INTENT_RULES = {
  // Practical problems, disputes, checkpoint encounters, violations, and serious crime cases.
  // These MUST receive direct step-by-step navigation guidelines — NEVER analogies or metaphors!
  practicalIndicators: [
    "my landlord", "landlord locked", "remove my roof", "remove roof", "pack out", "quit notice",
    "police stop", "stopped me", "checkpoint", "search my phone", "search phone", "unlock my phone",
    "arrest", "arrested", "detain", "detained", "in a cell", "in cell", "handcuff", "station",
    "bail money", "pay for bail", "demanding bail", "bribe", "extortion", "extort",
    "threat", "threatened", "beaten", "assault", "stolen", "fraud", "scam",
    "is this legal", "is it legal", "what can i do", "what should i do", "how do i handle",
    "can they do this", "can police do this", "can my landlord", "can an officer",
    // Pidgin dispute & crisis signals
    "dem carry", "dem lock", "dem hold", "carry me go", "wan comot my roof", "wan drive me",
    "dey threaten", "dey beat", "collect my money", "wetin i fit do"
  ],

  // Explicit requests to explain or demystify a specific law, section, or constitutional right.
  // ONLY these receive analogies and illustrative examples when personally asked for!
  explanationKeywords: [
    "explain", "break down", "meaning of", "what does the law say about",
    "what does section", "tell me about section", "teach me about",
    "demystify", "summarize", "with an example", "with example", "with analogy"
  ],

  platformTerms: [
    "what is rightaware", "about rightaware", "who built rightaware", "who made rightaware",
    "what does rightaware do", "is rightaware free", "are you a lawyer", "are you lawyers",
    "how to use rightaware", "what can you do", "rightaware features",
    "how do i search laws", "where is the police guide", "how does this platform work",
    "wetin be rightaware", "wetin una dey do", "how this thing work", "na free"
  ],

  greetingPatterns: [
    /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening|day|night))[\s!.,?]*$/i,
    /^(how\s*far|how\s*you\s*dey|how\s*bodi|kedu|bawo\s*ni|bawo|sannu|pele)[\s!.,?]*$/i,
    /^(what'?s?\s*up|sup|yo|oya)[\s!.,?]*$/i
  ]
};

function classifyIntent(rawMessage) {
  const msg = String(rawMessage || "").trim();
  if (!msg) return "INTENT_GREETING_CASUAL";

  // Expand Pidgin before checking patterns
  const expanded = expandPidgin(msg).toLowerCase();
  const rawLower = msg.toLowerCase();

  // Tier 1: Platform Inquiries
  for (const term of INTENT_RULES.platformTerms) {
    if (rawLower.includes(term) || expanded.includes(term)) {
      return "INTENT_PLATFORM_INQUIRY";
    }
  }

  // Tier 2: Pure Greetings (anchored regex strictly on raw message)
  for (const pattern of INTENT_RULES.greetingPatterns) {
    if (pattern.test(msg)) {
      return "INTENT_GREETING_CASUAL";
    }
  }

  // Tier 3: Practical disputes, incidents, checkpoints, crimes, and personal dilemmas
  // These get direct step-by-step navigation guidelines — NEVER analogies!
  for (const term of INTENT_RULES.practicalIndicators) {
    if (rawLower.includes(term) || expanded.includes(term)) {
      return "INTENT_PRACTICAL_GUIDANCE";
    }
  }

  // Tier 4: Explicit requests to explain/demystify the law, constitution, or rights
  // Only queries where the citizen personally asks for an explanation of a law/right get analogies & examples!
  const hasExplainKeyword = INTENT_RULES.explanationKeywords.some(kw => rawLower.includes(kw) || expanded.includes(kw));
  const hasLawTopic = /(section|s\.\s*\d+|act|constitution|law|right|statute|code|chapter)/i.test(msg);

  if (hasExplainKeyword && hasLawTopic) {
    return "INTENT_EXPLAIN_LAW";
  }

  // Substantive law query without personal dispute indicator
  if (hasLawTopic && !INTENT_RULES.practicalIndicators.some(term => rawLower.includes(term))) {
    return "INTENT_EXPLAIN_LAW";
  }

  // Default: Practical guidance
  return "INTENT_PRACTICAL_GUIDANCE";
}

/* =========================================================
   DYNAMIC SYSTEM PROMPT & TOKEN LIMIT BUILDER
   ========================================================= */

function buildSystemPrompt(intent) {
  const baseRules = `
You are RightAware AI, an authoritative, helpful, and empathetic Nigerian civic and legal-awareness companion inside RightAware.
You are NOT a lawyer and you do NOT provide private legal counsel.
Never invent laws, constitutional sections, phone numbers, or email addresses. Use only verified facts.
If the citizen writes in Nigerian Pidgin, respond naturally and warmly in Nigerian Pidgin. If they write in English, respond in clear Nigerian English.
End every response with exactly:
General legal information only — not legal advice. Verify important points with a qualified professional.
`;

  if (intent === "INTENT_PLATFORM_INQUIRY") {
    return `
${baseRules}
OPERATIONAL MODE: PLATFORM INQUIRY & CITIZEN ONBOARDING
1. The user is asking about the RightAware platform itself, its mission, its tools, or how it works.
2. Clearly explain RightAware:
   - What it is: An independent Nigerian civic-tech platform that translates constitutional and statutory law into plain, accessible civic knowledge.
   - Core tools:
     * 28 Rights Topics (rights.html): Plain-language guides covering fundamental rights, police stops, bail, fair hearing, tenancy, consumer protection, etc.
     * Laws Library (laws.html): Searchable authentic Nigerian statutes and gazettes (1999 Constitution, Electoral Act 2022, ACJA 2015, Cybercrime Act, etc.).
     * Organizations Directory (organizations.html): Directory of public complaint commissions, human rights desks, and statutory ombudsmen.
     * Legal Professionals (lawyers.html): Directory of verified legal aid clinics and legal practitioners.
     * Emergency Help Console (help.html): Fast access to emergency helplines (Police CRU: 0805 700 0001, Emergency 112).
     * Printable Checklists (printables.html): Pocket-sized offline handbooks.
     * Video Guides (videos.html): Explanations in English and Nigerian Pidgin.
   - Access & Integrity: 100% free public access, NDPR privacy-compliant, zero tracking.
   - Identity: RightAware is not a law firm and not a government agency.
3. Keep your response direct, structured, and informative. Do NOT use panic de-escalation ("Take a deep breath" is banned here).
`;
  }

  if (intent === "INTENT_PRACTICAL_GUIDANCE") {
    return `
${baseRules}
OPERATIONAL MODE: PRACTICAL LEGAL GUIDELINES & INCIDENT NAVIGATION
1. The citizen is presenting an actual legal problem, dispute, police checkpoint encounter, landlord harassment, violation, or crime.
2. STRICT BAN ON ANALOGIES OR STORYTELLING METAPHORS:
   Do NOT provide analogies, metaphors, or fictional examples (no bus analogies, no bedroom comparisons, no market metaphors). The citizen is facing a real problem and needs direct, actionable guidance.
3. MANDATORY STEP-BY-STEP NAVIGATION GUIDELINES:
   Structure your answer into direct, numbered, step-by-step practical guidelines:
   - Direct Legal Assessment: State immediately whether the action is lawful or illegal under Nigerian law.
   - Step 1: Immediate Safety & De-escalation: What to say and do right now to protect safety and avoid physical escalation.
   - Step 2: Evidence & Documentation: Exactly what to document (photos of gates/notices, officer names, force numbers, patrol vehicles, station name, time, witnesses).
   - Step 3: Legal Shield & Rights: The exact statutory provisions protecting the citizen (e.g., Tenancy Law bar on self-help; Police Act 2020 S. 49 phone privacy; ACJA 2015 S. 30 free bail; Constitution S. 35 & 37).
   - Step 4: Actionable Next Steps & Helplines: Concrete steps to resolve the issue, including official contact channels (Police CRU: 0805 700 0001 / 0805 700 0002, National Emergency: 112, Citizens Mediation Centre, Legal Aid Council, or RightAware directory).
4. TONE: Calm, objective, professional, and protective. Focus 100% on practical navigation.
`;
  }

  // INTENT_EXPLAIN_LAW: Only when the person personally asked to explain a law/constitution/right
  return `
${baseRules}
OPERATIONAL MODE: STATUTORY EXPLANATION & LEGAL PEDAGOGY
1. The citizen has explicitly asked you to explain, break down, or demystify a specific law, constitutional section, or legal right.
2. YOU ARE EXPLICITLY AUTHORIZED AND DIRECTED TO USE EVERYDAY NIGERIAN ANALOGIES AND ILLUSTRATIVE EXAMPLES HERE:
   Break down the legal provision using this clear 4-part structure:
   a. Plain Meaning: What this law or right means in everyday language (English or Pidgin).
   b. Everyday Nigerian Analogy: Demystify the concept using a relatable everyday analogy:
      - e.g. Fair Hearing (S. 36): Like a football referee who cannot award a red card before seeing the foul and must let both teams play and speak.
      - e.g. Bail & Presumption of Innocence (S. 35, ACJA S. 30): Like having a market receipt for goods you bought; you do not have to buy back your freedom because bail is free by law.
      - e.g. Tenancy Laws: Like a formal commercial vehicle lease contract where the owner cannot push you out while driving.
      - e.g. Phone & Digital Privacy: Like your private bedroom; officers cannot rummage through personal spaces without statutory cause or warrant.
   c. Illustrative Example: A brief real-world scenario showing how this law works in practice.
   d. What the Law Says: Exact statutory citation (e.g. 1999 Constitution Chapter IV, ACJA 2015, Electoral Act 2022).
3. Keep it clear, engaging, and token-efficient.
`;
}

function getOutputTokenLimit(intent) {
  switch (intent) {
    case "INTENT_PLATFORM_INQUIRY":
      return 350;
    case "INTENT_EXPLAIN_LAW":
      return 500;
    case "INTENT_PRACTICAL_GUIDANCE":
      return 500;
    default:
      return MAX_DEFAULT_OUTPUT_TOKENS;
  }
}

function buildHistoryBlock(history, currentIntent) {
  if (!Array.isArray(history) || history.length === 0) return "";
  if (currentIntent === "INTENT_GREETING_CASUAL") return "";

  const maxTurns = currentIntent === "INTENT_PRACTICAL_GUIDANCE" ? 3 : 4;
  const maxCharsPerTurn = currentIntent === "INTENT_PRACTICAL_GUIDANCE" ? 350 : 500;

  const trimmed = history
    .slice(-maxTurns)
    .map(function (h) {
      const roleName = h.role === "assistant" ? "Assistant" : "Citizen";
      const textContent = String(h.text || "").slice(0, maxCharsPerTurn);
      return roleName + ": " + textContent;
    })
    .join("\n");

  if (!trimmed) return "";
  return "\n\nRECENT DIALOGUE CONTEXT (for continuity only; answer the current question on its own merits):\n" + trimmed;
}


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
  /* Standard OpenAI & Gemini OpenAI-compatible chat completions: choices[0].message.content */
  if (data && Array.isArray(data.choices) && data.choices[0] && data.choices[0].message) {
    const content = data.choices[0].message.content;
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
    if (Array.isArray(content)) {
      const parts = content.map(p => (p && typeof p.text === "string") ? p.text : "").filter(Boolean);
      if (parts.length) return parts.join("\n").trim();
    }
  }

  /* Gemini native response structure: candidates[0].content.parts[0].text */
  if (data && Array.isArray(data.candidates) && data.candidates[0] && data.candidates[0].content) {
    const parts = data.candidates[0].content.parts;
    if (Array.isArray(parts)) {
      const text = parts.map(p => (p && typeof p.text === "string") ? p.text : "").filter(Boolean).join("\n").trim();
      if (text) return text;
    }
  }

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

function makeContext(message, intent) {
  if (intent === "INTENT_PLATFORM_INQUIRY") {
    return {
      platform: PLATFORM_INFO,
      rights: [],
      laws: [],
      orgs: [],
      note: "Answer using the RightAware platform details provided. Direct the citizen to the relevant platform sections and pages."
    };
  }

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

function buildLinks(verifiedContext, intent) {
  const links = [];
  const sources = [];

  if (intent === "INTENT_PLATFORM_INQUIRY" || (verifiedContext && verifiedContext.platform)) {
    return {
      links: [
        { t: "RightAware: 28 Civic Rights Topics", u: "rights.html" },
        { t: "RightAware: Laws & Statutes Library", u: "laws.html" },
        { t: "RightAware: Organizations Directory", u: "organizations.html" },
        { t: "RightAware: Legal Professionals", u: "lawyers.html" },
        { t: "RightAware: Emergency Helplines", u: "help.html" },
        { t: "RightAware: Printable Guides", u: "printables.html" }
      ],
      sources: []
    };
  }


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
     - Guest caller: Enforce signed HttpOnly cookie +
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



    // In production, require authoritative server secrets to prevent forged HMAC signatures.
    // In local dev/preview environments, use an ephemeral in-memory random salt generated per worker cold start.
    let hmacSecret = process.env.GUEST_HMAC_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

    if (!hmacSecret && apiKey) {
      // In production/preview without GUEST_HMAC_SECRET, derive a cryptographically secure HMAC secret from the server-only AI_API_KEY
      hmacSecret = crypto.createHash("sha256").update("rightaware-guest-salt:" + apiKey).digest("hex");
    }
    if (!hmacSecret) {
      if (!global.__DEV_GUEST_HMAC_SALT) {
        global.__DEV_GUEST_HMAC_SALT = crypto.randomBytes(32).toString("hex");
      }
      hmacSecret = global.__DEV_GUEST_HMAC_SALT;
    }

    const cookies = parseCookies(req.headers ? req.headers.cookie : "");
    guestId = verifyGuestCookie(cookies.ra_guest_token, hmacSecret);
    let needSetCookie = false;
    if (!guestId) {
      guestId = crypto.randomUUID();
      needSetCookie = true;
    }
    const isSecure = (req.headers && req.headers["x-forwarded-proto"] === "https") || process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    if (needSetCookie) {
      res.setHeader("Set-Cookie", serializeGuestCookie(guestId, hmacSecret, isSecure));
    }

    // 3. Database Quota Mutation with Graceful Fallback
    let rpcRes = null;
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL) {
        rpcRes = await callSupabaseRpc("increment_guest_quota", {
          p_guest_id: guestId,
          p_ip_subnet: ipSubnet
        });
      }
    } catch (e) {
      console.warn("[RA_GUEST_QUOTA_WARN] Supabase RPC unavailable, using cookie quota fallback:", e.message);
    }

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
      // Graceful Cookie-Scoped Quota Fallback (when Supabase Service Role is not connected)
      const countCookieName = "ra_guest_c";
      const currentCount = parseInt(cookies[countCookieName] || "0", 10) || 0;

      if (currentCount >= 3) {
        return res.status(403).json({
          ok: false,
          code: "free_limit_reached",
          attempts: 3,
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

      guestQuota = { current_attempts: currentCount, allowed: true };
    }
  }


  const intent = classifyIntent(message);

  /* ---------------------------------------------------------
     FAST PATH: GREETING / CASUAL INTENT
     Zero upstream LLM call. Sub-5ms deterministic response.
     Guest quota cookie and DB states remain strictly synchronized.
     --------------------------------------------------------- */
  if (intent === "INTENT_GREETING_CASUAL") {
    if (isGuest && guestId) {
      const countCookieName = "ra_guest_c";
      const currentCount = (guestQuota && typeof guestQuota.current_attempts === "number") ? guestQuota.current_attempts : 0;
      const nextCount = currentCount + 1;
      const isSecure = (req.headers && req.headers["x-forwarded-proto"] === "https") || process.env.NODE_ENV === "production" || !!process.env.VERCEL;
      const existingCookies = res.getHeader("Set-Cookie");
      const cookieList = Array.isArray(existingCookies) ? existingCookies : existingCookies ? [existingCookies] : [];
      cookieList.push(`${countCookieName}=${nextCount}; Path=/; Max-Age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`);
      res.setHeader("Set-Cookie", cookieList);
      if (guestQuota) guestQuota.current_attempts = nextCount;
    }

    return res.status(200).json({
      ok: true,
      text: pickGreeting(),
      links: [
        { t: "RightAware: 28 Civic Rights Topics", u: "rights.html" },
        { t: "RightAware: Laws & Statutes Library", u: "laws.html" },
        { t: "RightAware: Emergency Helplines", u: "help.html" }
      ],
      sources: [],
      disclaimer: DISCLAIMER,
      model: "static",
      isGreeting: true,
      isGuest: isGuest,
      guestAttempts: guestQuota ? guestQuota.current_attempts : undefined,
      guestMax: isGuest ? 3 : undefined
    });
  }

  /* ---------------------------------------------------------
     DYNAMIC SYSTEM PROMPT & TOKEN BUDGET BY INTENT
     --------------------------------------------------------- */

  const systemPrompt = buildSystemPrompt(intent);
  const maxOutputTokens = getOutputTokenLimit(intent);

  /* ---------------------------------------------------------
     OPTIONAL PAGE CONTEXT & CONVERSATIONAL HISTORY
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

  const conversationHistory = buildHistoryBlock(body.history, intent);

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
      makeContext(message, intent);
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
    conversationHistory +
    pageContext +
    "\n\nRIGHTAWARE VERIFIED CONTEXT:\n" +
    JSON.stringify(
      verifiedContext
    );


  /* ---------------------------------------------------------
     AI PROVIDER REQUEST WITH MULTI-TIER RESILIENCE CASCADE
     --------------------------------------------------------- */

  const { model, apiUrl, isGemini } = resolveAiConfig(apiKey);
  const candidateModels = getCandidateModels(model, isGemini);

  const PER_MODEL_TIMEOUT_MS = 10000; // 10s per-model attempt budget
  let lastResponse = null;
  let lastProviderText = "";
  let lastProviderData = null;
  let answer = "";
  let activeModel = "";

  try {
    for (let i = 0; i < candidateModels.length; i++) {
      const candidate = candidateModels[i];
      const isLast = i === candidateModels.length - 1;
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);

      try {
        const payload = apiUrl.includes("/responses")
          ? {
              model: candidate,
              instructions: systemPrompt,
              input: input,
              max_output_tokens: maxOutputTokens
            }
          : {
              model: candidate,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: input }
              ],
              max_tokens: maxOutputTokens
            };

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey,
            "User-Agent": "RightAware-AI/1.0"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        lastResponse = res;
        lastProviderText = await res.text();
        try {
          lastProviderData = JSON.parse(lastProviderText);
        } catch (_) {
          lastProviderData = null;
        }

        if (res.ok) {
          const text = extractResponseText(lastProviderData);
          if (text) {
            answer = text;
            activeModel = candidate;
            if (i > 0) {
              console.warn(`[RA_AI_RECOVERY] Model "${candidateModels[0]}" degraded; successfully recovered using candidate model "${candidate}"`);
            }
            break; // Valid AI answer obtained!
          }
        }

        const status = res.status;
        const isTransient = status === 503 || status === 429 || status === 500 || status === 502 || status === 504 || status === 404;

        if (isTransient) {
          // Trip circuit breaker for degraded model
          modelCooldowns.set(candidate, Date.now() + MODEL_COOLDOWN_MS);
          console.warn(`[RA_AI_FALLBACK] Candidate "${candidate}" returned HTTP ${status}. Tripped 60s circuit breaker. ${isLast ? "No more candidates." : "Cascading to next candidate..."}`);
          if (!isLast) continue;
        } else {
          // Fatal auth/client error (e.g. 401 Unauthorized, 403 Forbidden)
          console.error(`[RA_AI_FATAL_ERROR] Candidate "${candidate}" returned non-retryable HTTP ${status}`);
          break;
        }
      } catch (fetchErr) {
        const isTimeout = fetchErr.name === "AbortError";
        modelCooldowns.set(candidate, Date.now() + MODEL_COOLDOWN_MS);
        console.warn(`[RA_AI_EXCEPTION] Candidate "${candidate}" ${isTimeout ? "timed out after " + PER_MODEL_TIMEOUT_MS + "ms" : "network error: " + fetchErr.message}. ${isLast ? "No more candidates." : "Cascading to next candidate..."}`);
        if (!isLast) continue;
      } finally {
        clearTimeout(timerId);
      }
    }

    /* -------------------------------------------------------
       PROVIDER ERROR (IF ALL CANDIDATES FAILED OR UNREADABLE)
       ------------------------------------------------------- */

    if (!lastResponse || !lastResponse.ok || !answer) {
      const providerMessage =
        lastProviderData &&
        lastProviderData.error &&
        lastProviderData.error.message
          ? String(lastProviderData.error.message)
          : lastProviderText
            ? lastProviderText.slice(0, 500)
            : (!lastResponse ? "Upstream AI provider timeout on all candidate models." : "No provider error message.");

      console.error(
        "RIGHTAWARE_AI_PROVIDER_ERROR",
        lastResponse ? lastResponse.status : 504,
        providerMessage
      );

      // Refund guest quota attempt if upstream provider fails
      if (isGuest && guestId) {
        try {
          await callSupabaseRpc("refund_guest_quota", { p_guest_id: guestId });
        } catch (_) {}
      }

      return res.status(503).json({
        ok: false,
        code: "provider_unavailable",
        error: "The AI assistant is temporarily unavailable. Verified guides and helplines are available below.",
        providerStatus: lastResponse ? lastResponse.status : 504,
        providerMessage: providerMessage,
        disclaimer: DISCLAIMER
      });
    }


    /* -------------------------------------------------------
       BUILD RIGHTAWARE LINKS + SOURCES
       ------------------------------------------------------- */

    const resourceData =
      buildLinks(
        verifiedContext,
        intent
      );


    /* -------------------------------------------------------
       SUCCESS
       ------------------------------------------------------- */

    // Single Ownership Quota Invariant:
    // Only charge and increment guest quota upon VERIFIED SUCCESSFUL answer generation
    if (isGuest && guestId) {
      const countCookieName = "ra_guest_c";
      const currentCount = (guestQuota && typeof guestQuota.current_attempts === "number") ? guestQuota.current_attempts : 0;
      const nextCount = currentCount + 1;
      const isSecure = (req.headers && req.headers["x-forwarded-proto"] === "https") || process.env.NODE_ENV === "production" || !!process.env.VERCEL;
      const existingCookies = res.getHeader("Set-Cookie");
      const cookieList = Array.isArray(existingCookies) ? existingCookies : existingCookies ? [existingCookies] : [];
      cookieList.push(`${countCookieName}=${nextCount}; Path=/; Max-Age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`);
      res.setHeader("Set-Cookie", cookieList);
      if (guestQuota) guestQuota.current_attempts = nextCount;
    }

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

      model: activeModel,

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

    return res.status(503).json({
      ok: false,
      code: "provider_unavailable",
      error: "Temporary network connection issue contacting the AI provider. Verified guides and helplines are available below.",
      providerMessage: error && error.message ? error.message : String(error),
      disclaimer: DISCLAIMER
    });
  }
};