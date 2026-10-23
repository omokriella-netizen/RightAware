-- ============================================================================
-- RightAware: Guest AI Quotas & Rate Limiting Migration
-- Protects OpenAI compute budget while offering 3 free preview queries per 24h.
-- Binds quota to cryptographic signed cookie & Turnstile verification.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guest_ai_quotas (
    guest_id UUID PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 1,
    ip_subnet CIDR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for CGNAT subnet burst protection and cleanup
CREATE INDEX IF NOT EXISTS idx_guest_quotas_subnet_window 
ON public.guest_ai_quotas (ip_subnet, updated_at);

-- Enable Row Level Security (RLS) - Server-only access via service_role
ALTER TABLE public.guest_ai_quotas ENABLE ROW LEVEL SECURITY;

-- No public direct SELECT/INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS guest_quotas_service_only ON public.guest_ai_quotas;
CREATE POLICY guest_quotas_service_only ON public.guest_ai_quotas
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Atomic increment with 24h sliding window, WAL short-circuit, and CGNAT burst ceiling
CREATE OR REPLACE FUNCTION increment_guest_quota(
    p_guest_id UUID,
    p_ip_subnet CIDR DEFAULT NULL
)
RETURNS TABLE(allowed BOOLEAN, current_attempts INTEGER, status_code TEXT) AS $$
DECLARE
    v_attempts INTEGER;
    v_subnet_burst BIGINT;
BEGIN
    -- 1. CGNAT Burst Ceiling: Max 100 aggregate guest requests per minute per subnet
    IF p_ip_subnet IS NOT NULL THEN
        SELECT COUNT(*) INTO v_subnet_burst
        FROM public.guest_ai_quotas
        WHERE ip_subnet = p_ip_subnet
          AND updated_at >= timezone('utc'::text, now()) - interval '1 minute';

        IF v_subnet_burst >= 100 THEN
            RETURN QUERY SELECT FALSE, 999, 'subnet_burst_limit';
            RETURN;
        END IF;
    END IF;

    -- 2. Atomic UPSERT with 24-hour sliding TTL and WAL write short-circuiting
    INSERT INTO public.guest_ai_quotas (guest_id, attempts, ip_subnet, updated_at)
    VALUES (p_guest_id, 1, p_ip_subnet, timezone('utc'::text, now()))
    ON CONFLICT (guest_id) DO UPDATE
    SET attempts = CASE
            WHEN public.guest_ai_quotas.updated_at < timezone('utc'::text, now()) - interval '24 hours' THEN 1
            ELSE public.guest_ai_quotas.attempts + 1
        END,
        ip_subnet = COALESCE(p_ip_subnet, public.guest_ai_quotas.ip_subnet),
        updated_at = timezone('utc'::text, now())
    WHERE public.guest_ai_quotas.attempts <= 3
       OR public.guest_ai_quotas.updated_at < timezone('utc'::text, now()) - interval '24 hours'
    RETURNING public.guest_ai_quotas.attempts INTO v_attempts;

    -- 3. Defend against PostgreSQL RETURNING NULL on short-circuited WHERE
    IF v_attempts IS NULL THEN
        SELECT attempts INTO v_attempts
        FROM public.guest_ai_quotas
        WHERE guest_id = p_guest_id;

        v_attempts := COALESCE(v_attempts, 4);
        RETURN QUERY SELECT FALSE, v_attempts, 'quota_exhausted';
        RETURN;
    END IF;

    -- 4. Evaluate Quota Boundary
    IF v_attempts <= 3 THEN
        RETURN QUERY SELECT TRUE, v_attempts, 'ok';
    ELSE
        RETURN QUERY SELECT FALSE, v_attempts, 'quota_exhausted';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compensating decrement function: refunds attempt if upstream OpenAI API fails
CREATE OR REPLACE FUNCTION refund_guest_quota(p_guest_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.guest_ai_quotas
    SET attempts = GREATEST(0, attempts - 1),
        updated_at = timezone('utc'::text, now())
    WHERE guest_id = p_guest_id
      AND attempts > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicit security hardening: revoke public, anon, and authenticated execution on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.increment_guest_quota(UUID, CIDR) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_guest_quota(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_guest_quota(UUID, CIDR) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_guest_quota(UUID) TO service_role;
