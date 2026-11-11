// supabase/functions/synthesize-indigenous-speech/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { normalizeCitationsForTTS } from "./citation-normalizer.ts";

const NAIJA_SPEECH_BASE_URL = "https://asr.naijallm.com/v1";
const STORAGE_BUCKET = "legal-audio-assets";

// Official Naija Speech Voice and Language Configuration
export const NAIJA_SPEECH_CONFIG = {
  en: {
    language: "en",
    defaultVoice: "idera",
    validVoices: new Set([
      "idera",
      "emma",
      "jude",
      "osagie",
      "tayo",
      "zainab",
      "joke",
      "regina",
      "remi",
      "umar",
      "chinenye",
      "onye",
    ]),
  },
  yo: {
    language: "yo",
    defaultVoice: "yoruba_female2",
    validVoices: new Set(["yoruba_male2", "yoruba_female2", "yoruba_female1", "yoruba_clear"]),
  },
  ig: {
    language: "ig",
    defaultVoice: "igbo_female2",
    validVoices: new Set(["igbo_female2", "igbo_male2", "igbo_female1"]),
  },
  ha: {
    language: "ha",
    defaultVoice: "hausa_female2",
    validVoices: new Set(["hausa_male2", "hausa_female1", "hausa_female2", "hausa_male1", "hausa_clear"]),
  },
} as const;

interface TTSRequest {
  text: string;
  language: "en" | "yo" | "ig" | "ha";
  voice_id?: string;
}

// Sentence-boundary safe chunking (never slices mid-word or mid-statute)
function getSafeTTSChunk(text: string, maxLen = 750): string {
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

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { text, language, voice_id }: TTSRequest = await req.json();

    if (!text || !language) {
      return new Response(JSON.stringify({ error: "Missing text or language" }), { status: 400 });
    }

    const langConfig = NAIJA_SPEECH_CONFIG[language];
    if (!langConfig) {
      return new Response(JSON.stringify({ error: `Unsupported language: ${language}` }), { status: 400 });
    }

    // Resolve voice according to official API presets
    const resolvedVoice = (voice_id && langConfig.validVoices.has(voice_id))
      ? voice_id
      : langConfig.defaultVoice;

    // STEP 1: Normalize citations and numbers (indigenous languages expand to local phonetics; English expands to natural spoken English)
    const phoneticText = (language === "en")
      ? text
          .replace(/\[?(?:Section|S\.)\s*(\d+)(?:\(([a-zA-Z0-9]+)\))?,\s*([^\]\n]+)\]?/gi, (_, sec, sub, stat) => {
            return `Section ${sec}${sub ? ` subsection ${sub}` : ""} of the ${stat.trim()}`;
          })
          .replace(/[\[\]\(\)]/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : normalizeCitationsForTTS(text, language);

    // STEP 2: Apply sentence-boundary chunking to guarantee < 750 characters
    const safeSpokenText = getSafeTTSChunk(phoneticText, 750);

    // STEP 3: Compute deterministic contentHash from the ACTUAL spoken payload
    const rawKey = `${language}:${resolvedVoice}:${safeSpokenText.toLowerCase()}`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 2. Fast-Path: Check If Already Synthesized
    const { data: cached } = await supabase
      .from("tts_audio_cache")
      .select("status, audio_url")
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (cached?.status === "ready" && cached.audio_url) {
      EdgeRuntime.waitUntil(
        supabase.rpc("increment_tts_hit_count", { p_hash: contentHash })
      );
      return new Response(JSON.stringify({ audio_url: cached.audio_url, cached: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }

    // 3. Stampede Defense: Atomic Lease Reclamation RPC
    const { data: leaseId, error: leaseError } = await supabase.rpc("acquire_tts_lease", {
      p_hash: contentHash,
      p_lang: language,
      p_provider: "naija_speech",
      p_lease_seconds: 20,
    });

    if (leaseError) throw leaseError;

    const isWinner = !!leaseId;

    if (!isWinner) {
      // FOLLOWER PATH: Poll for winner completion (max 8 seconds with 500ms intervals)
      const maxAttempts = 16;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: check } = await supabase
          .from("tts_audio_cache")
          .select("status, audio_url")
          .eq("content_hash", contentHash)
          .maybeSingle();

        if (check?.status === "ready" && check.audio_url) {
          return new Response(JSON.stringify({ audio_url: check.audio_url, cached: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (check?.status === "failed") {
          throw new Error("TTS generation failed by primary worker");
        }
      }
      throw new Error("TTS generation timed out waiting for upstream lock");
    }

    // WINNER PATH: Synthesize via Naija Speech API with crash-safe catch block
    const apiKey = Deno.env.get("NAIJA_SPEECH_API_KEY");
    if (!apiKey) throw new Error("Missing NAIJA_SPEECH_API_KEY");

    try {
      const speechRes = await fetch(`${NAIJA_SPEECH_BASE_URL}/audio/speech`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "naija-tts",
          input: safeSpokenText,
          voice: resolvedVoice,
          language: langConfig.language,
          response_format: "mp3",
        }),
      });

      if (!speechRes.ok) {
        const errText = await speechRes.text();
        throw new Error(`TTS upstream error HTTP ${speechRes.status}: ${errText}`);
      }

      const audioBytes = await speechRes.arrayBuffer();
      const filePath = `${language}/${contentHash}.mp3`;

      // Upload to Supabase Storage with immutable public CDN caching
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, audioBytes, {
          contentType: "audio/mpeg",
          cacheControl: "31536000",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Update Cache Status to Ready
      await supabase
        .from("tts_audio_cache")
        .update({
          status: "ready",
          audio_storage_path: filePath,
          audio_url: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("content_hash", contentHash);

      return new Response(JSON.stringify({ audio_url: publicUrlData.publicUrl, cached: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (winnerErr: any) {
      // Release lock to 'failed' so waiting followers abort on their next 500ms tick
      await supabase
        .from("tts_audio_cache")
        .update({
          status: "failed",
          error_message: winnerErr.message || "Unhandled synthesis error",
          updated_at: new Date().toISOString(),
        })
        .eq("content_hash", contentHash);

      throw winnerErr;
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

