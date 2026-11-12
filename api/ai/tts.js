"use strict";

// api/ai/tts.js
// RightAware Zero-Trust Multilingual Speech Synthesis Serverless Endpoint (Vercel & Local)

const crypto = require("crypto");

const NAIJA_SPEECH_BASE_URL = "https://asr.naijallm.com/v1";
const STORAGE_BUCKET = "legal-audio-assets";

// Official Naija Speech Voice & Language Registry
const NAIJA_SPEECH_CONFIG = {
  en: {
    language: "en",
    defaultVoice: "idera",
    validVoices: new Set([
      "idera", "emma", "jude", "osagie", "tayo", "zainab",
      "joke", "regina", "remi", "umar", "chinenye", "onye"
    ])
  },
  yo: {
    language: "yo",
    defaultVoice: "yoruba_female2",
    validVoices: new Set(["yoruba_male2", "yoruba_female2", "yoruba_female1", "yoruba_clear"])
  },
  ig: {
    language: "ig",
    defaultVoice: "igbo_female2",
    validVoices: new Set(["igbo_female2", "igbo_male2", "igbo_female1"])
  },
  ha: {
    language: "ha",
    defaultVoice: "hausa_female2",
    validVoices: new Set(["hausa_male2", "hausa_female1", "hausa_female2", "hausa_male1", "hausa_clear"])
  }
};

// Spoken Statues Map
const STATUTORY_SPOKEN_MAP = {
  "1999 Constitution": {
    yo: "Iwe Ofin Naijiria",
    ig: "Iwu Ala Nigeria",
    ha: "Tsarin Mulkin Najeriya"
  },
  "ACJA 2015": {
    yo: "Ofin Idajo Odaran",
    ig: "Iwu Ikpe Mpu",
    ha: "Dokar Shari'ar Laifuka"
  },
  "Police Act 2020": {
    yo: "Ofin Olopaa",
    ig: "Iwu ndi Uwe Ojii",
    ha: "Dokar Rundunar Yan Sanda"
  },
  "Child Rights Act": {
    yo: "Ofin Eto Omode",
    ig: "Iwu Ikike Umuaka",
    ha: "Dokar Kare Hakkin Yara"
  },
  "Cybercrimes Act 2015": {
    yo: "Ofin Odaran Ayelujara",
    ig: "Iwu Mpu Kọmputa",
    ha: "Dokar Laifukan Yanar Gizo"
  }
};

const SECTION_LABEL_MAP = {
  yo: { section: "Abala", subsection: "ẹsẹ", inStatute: "nínú" },
  ig: { section: "Nkeji", subsection: "nkebi", inStatute: "n'ime" },
  ha: { section: "Sashi na", subsection: "karamin sashi na", inStatute: "a cikin" }
};

function normalizeCitationsForTTS(text, lang) {
  if (!text) return "";
  if (lang === "en") {
    return text
      .replace(/\[?(?:Section|S\.)\s*(\d+)(?:\(([a-zA-Z0-9]+)\))?,\s*([^\]\n]+)\]?/gi, (_, sec, sub, stat) => {
        return `Section ${sec}${sub ? ` subsection ${sub}` : ""} of the ${stat.trim()}`;
      })
      .replace(/[\[\]\(\)]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const secLabels = SECTION_LABEL_MAP[lang] || SECTION_LABEL_MAP.yo;
  let out = text.replace(/\[?(?:Section|S\.)\s*(\d+)(?:\(([a-zA-Z0-9]+)\))?,\s*([^\]\n]+)\]?/gi, (_, sec, sub, stat) => {
    const rawStat = stat.trim();
    const spokenStat = (STATUTORY_SPOKEN_MAP[rawStat] && STATUTORY_SPOKEN_MAP[rawStat][lang]) || rawStat;
    return `${secLabels.section} ${sec}${sub ? ` ${secLabels.subsection} ${sub}` : ""} ${secLabels.inStatute} ${spokenStat}`;
  });

  return out.replace(/[\[\]\(\)]/g, "").replace(/\s+/g, " ").trim();
}

function getSafeTTSChunk(text, maxLen = 750) {
  if (text.length <= maxLen) return text.trim();
  const truncated = text.slice(0, maxLen);
  const lastTerminal = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("\n")
  );
  if (lastTerminal > maxLen * 0.5) {
    return truncated.slice(0, lastTerminal + 1).trim();
  }
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim();
}

// In-memory memory cache across serverless warm invocations
const memoryCache = new Map();

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  const rawText = typeof body.text === "string" ? body.text.trim() : "";
  let lang = typeof body.language === "string" ? body.language.trim().toLowerCase() : "";
  const voiceId = typeof body.voice_id === "string" ? body.voice_id.trim() : undefined;

  if (!rawText || !lang) {
    return res.status(400).json({ ok: false, error: "Missing required fields: text, language" });
  }

  // Map Nigerian Pidgin (pcm) to Nigerian English (en) with idera voice
  if (lang === "pcm") {
    lang = "en";
  }

  const langConfig = NAIJA_SPEECH_CONFIG[lang];
  if (!langConfig) {
    return res.status(400).json({ ok: false, error: `Unsupported language: ${lang}. Supported: en, pcm, yo, ig, ha` });
  }

  const resolvedVoice = (voiceId && langConfig.validVoices.has(voiceId))
    ? voiceId
    : (lang === "pcm" ? "idera" : langConfig.defaultVoice);

  const phoneticText = normalizeCitationsForTTS(rawText, lang);
  const safeSpokenText = getSafeTTSChunk(phoneticText, 750);

  // Deterministic Content Hash
  const hashPayload = `${lang}:${resolvedVoice}:${safeSpokenText.toLowerCase()}`;
  const contentHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

  // 1. Fast-Path Memory Cache (0ms latency)
  if (memoryCache.has(contentHash)) {
    return res.status(200).json({
      ok: true,
      audio_url: memoryCache.get(contentHash),
      cached: true
    });
  }

  // 2. Fast-Path Supabase Cache (if credentials present)
  const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/\/$/, "") : "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (supabaseUrl && supabaseKey) {
    try {
      const checkRes = await fetch(`${supabaseUrl}/rest/v1/tts_audio_cache?content_hash=eq.${contentHash}&select=status,audio_url`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      if (checkRes.ok) {
        const rows = await checkRes.json();
        if (rows && rows.length && rows[0].status === "ready" && rows[0].audio_url) {
          memoryCache.set(contentHash, rows[0].audio_url);
          return res.status(200).json({
            ok: true,
            audio_url: rows[0].audio_url,
            cached: true
          });
        }
      }
    } catch (_) {}
  }

  // 3. Upstream Synthesis via Naija Speech API
  const apiKey = process.env.NAIJA_SPEECH_API_KEY;
  if (!apiKey) {
    // If in development mode or offline test, supply mock base64 audio
    if (process.env.APP_ENV === "development" || !process.env.VERCEL) {
      const silentMp3Base64 = "//NAxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
      const mockUrl = `data:audio/mp3;base64,${silentMp3Base64}`;
      return res.status(200).json({
        ok: true,
        audio_url: mockUrl,
        cached: false,
        dev_mock: true
      });
    }

    return res.status(501).json({
      ok: false,
      code: "not_configured",
      error: "NAIJA_SPEECH_API_KEY is not configured in Vercel environment variables.",
      message: "Please add NAIJA_SPEECH_API_KEY to your Vercel Project Settings."
    });
  }

  try {
    const speechRes = await fetch(`${NAIJA_SPEECH_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "naija-tts",
        input: safeSpokenText,
        voice: resolvedVoice,
        language: langConfig.language,
        response_format: "mp3"
      })
    });

    if (!speechRes.ok) {
      const errText = await speechRes.text();
      return res.status(502).json({
        ok: false,
        code: "upstream_tts_error",
        error: `Naija Speech API returned HTTP ${speechRes.status}: ${errText.slice(0, 300)}`
      });
    }

    const audioBytes = await speechRes.arrayBuffer();
    const audioBuffer = Buffer.from(audioBytes);

    // 4. Persistence to Supabase Storage (if configured)
    if (supabaseUrl && supabaseKey) {
      try {
        const filePath = `${lang}/${contentHash}.mp3`;
        const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${filePath}`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "audio/mpeg",
            "x-upsert": "true"
          },
          body: audioBuffer
        });

        if (uploadRes.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
          memoryCache.set(contentHash, publicUrl);

          // Update cache table asynchronously
          fetch(`${supabaseUrl}/rest/v1/tts_audio_cache`, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify({
              content_hash: contentHash,
              language: lang,
              provider: "naija_speech",
              status: "ready",
              audio_storage_path: filePath,
              audio_url: publicUrl,
              updated_at: new Date().toISOString()
            })
          }).catch(() => {});

          return res.status(200).json({
            ok: true,
            audio_url: publicUrl,
            cached: false
          });
        }
      } catch (storageErr) {
        console.warn("[RightAware TTS] Supabase storage upload failed, falling back to direct base64 audio URI:", storageErr);
      }
    }

    // Direct Base64 Fallback: HTML5 Audio can play data: URIs directly without external storage
    const base64Url = `data:audio/mp3;base64,${audioBuffer.toString("base64")}`;
    memoryCache.set(contentHash, base64Url);

    return res.status(200).json({
      ok: true,
      audio_url: base64Url,
      cached: false
    });

  } catch (err) {
    console.error("[RightAware TTS Error]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error during speech synthesis."
    });
  }
};
