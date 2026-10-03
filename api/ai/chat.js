"use strict";

const DISCLAIMER =
  "General legal information only — not legal advice. Verify important points with a qualified professional.";

const MODEL = process.env.AI_MODEL || "gpt-6-luna";

const API_URL =
  process.env.AI_BASE_URL ||
  "https://api.openai.com/v1/responses";

const SYSTEM = `
You are RightAware AI, the Nigerian civic and legal-awareness assistant.

Your job is to help Nigerians understand their rights, civic responsibilities,
laws and general legal information in simple, clear language.

You are not a lawyer and you do not provide legal advice.

IMPORTANT RULES:

- Use the RIGHTAWARE VERIFIED CONTEXT supplied below as your primary knowledge source.
- Do not invent Nigerian laws, sections, cases, statistics, organisations,
  phone numbers, emails or URLs.
- If information is marked "verify", do not present it as independently confirmed.
- Do not manufacture citations.
- If the supplied information is insufficient, clearly say so.
- Answer the user's actual question directly.
- Use short paragraphs and bullets where useful.
- If the user writes Nigerian Pidgin, respond naturally in Nigerian Pidgin.
- If the user mixes English and Nigerian Pidgin, follow their style naturally.
- If someone is arrested, threatened or in immediate danger, give practical
  safety guidance first.
- Never request passwords, PINs, OTPs or bank details.
- Do not overstate certainty.
- Keep answers concise but useful.
- When a relevant RightAware guide exists, mention it naturally.
- Always end with:

General legal information only — not legal advice. Verify important points with a qualified professional.
`;

function extractResponseText(data) {
  if (
    data &&
    typeof data.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  if (data && Array.isArray(data.output)) {
    const pieces = [];

    for (const item of data.output) {
      if (!item || !Array.isArray(item.content)) continue;

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

let KB = null;

function loadKnowledgeBase() {
  if (KB) return KB;

  try {
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
    console.error("RIGHTAWARE_KB_LOAD_ERROR", error);

    KB = {
      rights: [],
      laws: []
    };

    return KB;
  }
}

function words(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(function (word) {
      return word.length >= 3;
    });
}

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
      score += word.length >= 5 ? 2 : 1;
    }
  }

  return score;
}

function findKnowledge(message) {
  const kb = loadKnowledgeBase();
  const queryWords = words(message);

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

  const laws = kb.laws
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
    .slice(0, 3)
    .map(function (x) {
      return x.item;
    });

  return {
    rights: rights,
    laws: laws
  };
}

function makeContext(message) {
  const found = findKnowledge(message);

  const rights = found.rights.map(function (r) {
    return {
      title: r.title,
      status: r.status,
      summary: r.summary,

      explanation: Array.isArray(r.explanation)
        ? r.explanation.slice(0, 3)
        : [],

      legalBasis: r.legalBasis || null,

      meaning: Array.isArray(r.meaning)
        ? r.meaning.slice(0, 5)
        : [],

      canDo: Array.isArray(r.canDo)
        ? r.canDo.slice(0, 5)
        : [],

      avoid: Array.isArray(r.avoid)
        ? r.avoid.slice(0, 4)
        : [],

      faqs: Array.isArray(r.faqs)
        ? r.faqs.slice(0, 3)
        : [],

      fullGuide: r.fullGuide || null,

      sources: Array.isArray(r.sources)
        ? r.sources.slice(0, 4)
        : []
    };
  });

  const laws = found.laws.map(function (l) {
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
      verification: l.verification || null
    };
  });

  return {
    rights: rights,
    laws: laws,

    note:
      "Only use details supplied here. A status of overview/partial " +
      "or a verification note means the detail needs confirmation."
  };
}

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST only."
    });
  }

  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      diagnostic: true,

      text:
        "RightAware AI connection diagnostic:\n\n" +
        "AI_API_KEY is not available to this Production deployment.",

      disclaimer: DISCLAIMER
    });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_) {
      return res.status(400).json({
        ok: false,
        error: "Invalid JSON request."
      });
    }
  }

  body = body || {};

  const message =
    typeof body.message === "string"
      ? body.message.trim()
      : "";

  if (!message) {
    return res.status(400).json({
      ok: false,
      error: "Please provide a message."
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      ok: false,
      error: "Message is too long."
    });
  }

  const pageContext =
    typeof body.context === "string" &&
    body.context.trim()
      ? "\n\nRIGHTAWARE PAGE CONTEXT:\n" +
        body.context.slice(0, 3000)
      : "";

  let verifiedContext = {};

  try {
    verifiedContext = makeContext(message);
  } catch (error) {
    console.error(
      "RIGHTAWARE_CONTEXT_ERROR",
      error
    );
  }

  const input =
    "USER QUESTION:\n" +
    message +
    pageContext +
    "\n\nRIGHTAWARE VERIFIED CONTEXT:\n" +
    JSON.stringify(verifiedContext);

  try {
    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },

      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM,
        input: input,
        max_output_tokens: 900
      })
    });

    const providerText = await response.text();

    let providerData = null;

    try {
      providerData = JSON.parse(providerText);
    } catch (_) {
      providerData = null;
    }

    if (!response.ok) {
      const providerMessage =
        providerData &&
        providerData.error &&
        providerData.error.message
          ? String(providerData.error.message)
          : providerText
            ? providerText.slice(0, 500)
            : "No provider error message.";

      console.error(
        "RIGHTAWARE_OPENAI_ERROR",
        response.status,
        providerMessage
      );

      return res.status(200).json({
        ok: false,
        diagnostic: true,

        text:
          "RightAware AI connection diagnostic:\n\n" +
          "OpenAI status: " +
          response.status +
          "\n\n" +
          providerMessage,

        disclaimer: "Temporary technical diagnostic."
      });
    }

    const answer = extractResponseText(providerData);

    if (!answer) {
      console.error(
        "RIGHTAWARE_OPENAI_UNREADABLE_RESPONSE",
        JSON.stringify(providerData).slice(0, 5000)
      );

      return res.status(200).json({
        ok: false,
        diagnostic: true,

        text:
          "RightAware AI connection diagnostic:\n\n" +
          "OpenAI accepted the request, but RightAware could not extract the generated answer.",

        disclaimer: "Temporary technical diagnostic."
      });
    }

    const links = [];
    const sources = [];

    for (const r of verifiedContext.rights || []) {
      if (r.fullGuide) {
        links.push({
          t: "RightAware: " + r.title,
          u: r.fullGuide
        });
      } else if (r.title && r.id) {
        links.push({
          t: "RightAware: " + r.title,
          u:
            "rights/topic.html?id=" +
            encodeURIComponent(r.id)
        });
      }

      for (const source of r.sources || []) {
        if (String(source).startsWith("VERIFY:")) {
          continue;
        }

        sources.push(String(source));
      }
    }

    for (const l of verifiedContext.laws || []) {
      if (l.id) {
        links.push({
          t: "Law: " + l.title,
          u: "laws.html"
        });
      }
    }

    return res.status(200).json({
      ok: true,
      text: answer,
      links: links.slice(0, 6),
      sources: [...new Set(sources)].slice(0, 6),
      disclaimer: DISCLAIMER,
      model: MODEL
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
        (
          error && error.message
            ? error.message
            : "Unknown server error."
        ),

      disclaimer: "Temporary technical diagnostic."
    });
  }
};