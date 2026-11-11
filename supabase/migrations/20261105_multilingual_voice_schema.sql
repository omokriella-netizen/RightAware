-- ====================================================================
-- RIGHTAWARE MULTILINGUAL VOICE & LEGAL KNOWLEDGE BASE SCHEMA
-- Migration: 20261105_multilingual_voice_schema.sql
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE translation_verification_status AS ENUM (
    'draft',
    'ai_generated',
    'lawyer_verified',
    'deprecated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE supported_nigerian_language AS ENUM (
    'en',   -- Nigerian English
    'yo',   -- Yoruba
    'ig',   -- Igbo
    'ha',   -- Hausa
    'pcm'   -- Nigerian Pidgin
  );
EXCEPTION
  WHEN duplicate_object THEN
    BEGIN
      ALTER TYPE supported_nigerian_language ADD VALUE IF NOT EXISTS 'en';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END;
END $$;

DO $$ BEGIN
  CREATE TYPE cache_lease_status AS ENUM (
    'pending',
    'ready',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. CANONICAL RIGHTS GUIDES (English Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.rights_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_en TEXT NOT NULL,
  statutory_citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. MULTILINGUAL TRANSLATIONS & STATIC AUDIO
CREATE TABLE IF NOT EXISTS public.rights_guide_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.rights_guides(id) ON DELETE CASCADE,
  language supported_nigerian_language NOT NULL,
  display_title TEXT NOT NULL,
  display_content TEXT NOT NULL,                      -- Readable text for visual UI
  phonetic_script TEXT NOT NULL,                     -- Text formatted with spelled-out numbers for TTS
  verification_status translation_verification_status NOT NULL DEFAULT 'draft',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  legal_review_notes TEXT,
  source_content_hash TEXT NOT NULL,                 -- SHA-256 of rights_guides.content_en when verified
  
  -- Pre-generated Audio Assets
  audio_storage_path TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  audio_generated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_guide_lang UNIQUE (guide_id, language)
);

-- 4. TTS AUDIO CACHE & DISTRIBUTED STAMPEDE LOCK
CREATE TABLE IF NOT EXISTS public.tts_audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL,                 -- sha256(language + voice_id + normalized_spoken_text)
  language supported_nigerian_language NOT NULL,
  provider TEXT NOT NULL,                            -- 'naija_speech' | 'langa' | 'vocalistic'
  status cache_lease_status NOT NULL DEFAULT 'pending',
  lease_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '20 seconds'),
  audio_storage_path TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  hit_count INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tts_cache_hash ON public.tts_audio_cache(content_hash);

-- 5. SERVERLESS WARMUP LEASES (Prevents Multi-Isolate Warmup Flooding)
CREATE TABLE IF NOT EXISTS public.provider_warmup_leases (
  provider TEXT PRIMARY KEY,
  last_warmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_warming BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.provider_warmup_leases (provider, last_warmed_at, is_warming)
VALUES ('langa_n_atlas', now() - INTERVAL '1 hour', false)
ON CONFLICT (provider) DO NOTHING;

-- 6. DYNAMIC AI CONVERSATION LOGS (Explicitly Unverified)
CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  language supported_nigerian_language NOT NULL,
  input_audio_path TEXT,
  raw_transcription TEXT,
  user_corrected_transcription TEXT,
  english_reformulated_query TEXT,
  retrieved_chunk_ids UUID[],
  grounded_english_response TEXT NOT NULL,
  final_translated_response TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,        -- ALWAYS FALSE FOR DYNAMIC AI
  disclaimer_accepted BOOLEAN NOT NULL DEFAULT true,
  tts_audio_cache_id UUID REFERENCES public.tts_audio_cache(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- ATOMIC STORED PROCEDURES & LEASE RECLAMATION (SECURITY DEFINER)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.acquire_tts_lease(
  p_hash TEXT,
  p_lang supported_nigerian_language,
  p_provider TEXT,
  p_lease_seconds INTEGER DEFAULT 20
)
RETURNS UUID AS $$
DECLARE
  v_lease_id UUID;
BEGIN
  INSERT INTO public.tts_audio_cache (
    content_hash,
    language,
    provider,
    status,
    lease_expires_at,
    updated_at
  )
  VALUES (
    p_hash,
    p_lang,
    p_provider,
    'pending',
    now() + (p_lease_seconds || ' seconds')::interval,
    now()
  )
  ON CONFLICT (content_hash) DO UPDATE
    SET 
      status = 'pending',
      lease_expires_at = now() + (p_lease_seconds || ' seconds')::interval,
      updated_at = now(),
      error_message = NULL
    WHERE 
      -- Atomically reclaim only if previously failed OR lease expired mid-flight
      tts_audio_cache.status = 'failed'
      OR (tts_audio_cache.status = 'pending' AND tts_audio_cache.lease_expires_at < now())
  RETURNING id INTO v_lease_id;

  RETURN v_lease_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.increment_tts_hit_count(p_hash TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.tts_audio_cache
  SET 
    hit_count = hit_count + 1,
    last_accessed_at = now()
  WHERE content_hash = p_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.try_claim_warmup_lease(
  p_provider TEXT,
  p_cooldown_minutes INTEGER DEFAULT 8
)
RETURNS BOOLEAN AS $$
DECLARE
  v_claimed BOOLEAN := false;
BEGIN
  UPDATE public.provider_warmup_leases
  SET 
    is_warming = true,
    last_warmed_at = now()
  WHERE provider = p_provider
    AND is_warming = false
    AND last_warmed_at < now() - (p_cooldown_minutes || ' minutes')::interval
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ====================================================================
-- HARDEN SECURITY DEFINER PERMISSIONS (SERVICE_ROLE ONLY)
-- ====================================================================

REVOKE ALL ON FUNCTION public.acquire_tts_lease(TEXT, supported_nigerian_language, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_tts_hit_count(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.try_claim_warmup_lease(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.acquire_tts_lease(TEXT, supported_nigerian_language, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_tts_hit_count(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_claim_warmup_lease(TEXT, INTEGER) TO service_role;

-- ====================================================================
-- AUTOMATED STALE-TRANSLATION INVALIDATION TRIGGER
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fn_invalidate_stale_guide_translations()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.content_en IS DISTINCT FROM NEW.content_en) OR 
     (OLD.statutory_citations IS DISTINCT FROM NEW.statutory_citations) THEN
    
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();

    UPDATE public.rights_guide_translations
    SET 
      verification_status = 'draft',
      legal_review_notes = COALESCE(legal_review_notes, '') || 
        E'\n[AUTO-INVALIDATED ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS UTC') || 
        ']: English source content updated from v' || OLD.version || 
        ' to v' || NEW.version || '. Mandatory lawyer re-verification required.',
      updated_at = now()
    WHERE guide_id = OLD.id
      AND verification_status = 'lawyer_verified';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invalidate_guide_translations ON public.rights_guides;

CREATE TRIGGER trg_invalidate_guide_translations
BEFORE UPDATE ON public.rights_guides
FOR EACH ROW
EXECUTE FUNCTION public.fn_invalidate_stale_guide_translations();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (ZERO-TRUST COMPLIANT)
-- ====================================================================

ALTER TABLE public.rights_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_guide_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_audio_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;

-- 1. Rights Guides: Public read for active guides
DROP POLICY IF EXISTS "Public can view active guides" ON public.rights_guides;
CREATE POLICY "Public can view active guides"
  ON public.rights_guides FOR SELECT
  USING (is_active = true);

-- 2. Guide Translations: Public read strictly for lawyer-verified
DROP POLICY IF EXISTS "Public can view lawyer-verified translations" ON public.rights_guide_translations;
CREATE POLICY "Public can view lawyer-verified translations"
  ON public.rights_guide_translations FOR SELECT
  USING (verification_status = 'lawyer_verified');

-- 3. Audio Cache: Public read strictly for ready CDN audio
DROP POLICY IF EXISTS "Public can view ready audio cache" ON public.tts_audio_cache;
CREATE POLICY "Public can view ready audio cache"
  ON public.tts_audio_cache FOR SELECT
  USING (status = 'ready');

-- 4. AI Chat Logs: ZERO-TRUST LOCKDOWN
DROP POLICY IF EXISTS "Authenticated users view own chat history" ON public.ai_chat_logs;
CREATE POLICY "Authenticated users view own chat history"
  ON public.ai_chat_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Anonymous role ('anon') is strictly denied SELECT on ai_chat_logs.
-- Direct client INSERTs are blocked; logged exclusively on server via service_role.
DROP POLICY IF EXISTS "Users can view own chat logs" ON public.ai_chat_logs;
DROP POLICY IF EXISTS "Users can insert chat logs" ON public.ai_chat_logs;
DROP POLICY IF EXISTS "Authenticated users can insert own chat logs" ON public.ai_chat_logs;
DROP POLICY IF EXISTS "Anonymous users can insert anonymous chat logs" ON public.ai_chat_logs;

