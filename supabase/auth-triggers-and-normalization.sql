-- RightAware — Auth Triggers, Intake Normalization & Claim Automation
-- File: supabase/auth-triggers-and-normalization.sql
-- Safe to run in Supabase SQL Editor (idempotent, defensive, non-breaking).

-- ============================================================================
-- 1. Schema Normalization for Organizations
-- ============================================================================

-- Add user_id foreign key if not present
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Multi-seat organizational membership table for institutional continuity
CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id text REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'admin', 'officer')) DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- One-time Backfill: Bind existing auth users to their organization rows by confirmed email
UPDATE public.organizations o
   SET user_id = u.id
  FROM auth.users u
 WHERE lower(o.email) = lower(u.email)
   AND o.user_id IS NULL;

-- Ensure owners exist in organization_members for backfilled rows
INSERT INTO public.organization_members (org_id, user_id, role)
SELECT id, user_id, 'owner'
  FROM public.organizations
 WHERE user_id IS NOT NULL
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ============================================================================
-- 2. Strict Row Level Security Policies (Dropping Mutable Email Debt)
-- ============================================================================

-- Drop legacy email-matching policy on organizations if it exists
DROP POLICY IF EXISTS own_orgs ON public.organizations;
DROP POLICY IF EXISTS own_org_member ON public.organizations;

-- Organization read/manage policy: strictly UUID and membership bound
CREATE POLICY own_org_member ON public.organizations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.organization_members m 
      WHERE m.org_id = organizations.id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY own_org_membership_read ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Re-point ra_update_own_organization to UUID ownership instead of email string
CREATE OR REPLACE FUNCTION public.ra_update_own_organization(
  p_id text,
  p_name text,
  p_logo_path text,
  p_description text,
  p_services text[],
  p_specialization text,
  p_location text,
  p_address text,
  p_phone text,
  p_website text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old_logo text;
  v_is_authorized boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  IF coalesce(trim(coalesce(p_name, '')), '') = '' THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  -- Verify ownership via immutable user_id or active organization membership
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
     WHERE o.id = p_id 
       AND (o.user_id = v_uid OR EXISTS (
         SELECT 1 FROM public.organization_members m 
          WHERE m.org_id = p_id AND m.user_id = v_uid AND m.role IN ('owner', 'admin')
       ))
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'not your organization';
  END IF;

  SELECT logo_path INTO v_old_logo
    FROM public.organizations WHERE id = p_id;

  IF p_logo_path IS DISTINCT FROM v_old_logo
     AND (p_logo_path IS NOT NULL
          AND left(p_logo_path, length(v_uid::text) + 1) <> v_uid::text || '/') THEN
    RAISE EXCEPTION 'logo path must come from your own uploads';
  END IF;

  UPDATE public.organizations
     SET name           = p_name,
         logo_path      = p_logo_path,
         description    = p_description,
         services       = coalesce(p_services, '{}'::text[]),
         specialization = p_specialization,
         location       = p_location,
         address        = p_address,
         phone          = p_phone,
         website        = p_website,
         updated_at     = now()
   WHERE id = p_id;

  RETURN (SELECT to_jsonb(o) FROM public.organizations o WHERE o.id = p_id);
END $$;

REVOKE ALL ON FUNCTION public.ra_update_own_organization FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ra_update_own_organization TO authenticated;

-- ============================================================================
-- 3. Bulletproof Intake Trigger on auth.users (AFTER INSERT)
-- ============================================================================
-- Unpacks raw_user_meta_data safely.
-- Never crashes user creation even on malformed optional client metadata.
-- Hardcodes verification_status = 'pending' and is_demo = false.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tr_handle_user_signup_intake()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_path text;
  v_name text;
  v_phone text;
  v_prof_id text;
  v_org_id text;
  v_specs text[];
  v_services text[];
  v_langs text[];
  v_elem text;
BEGIN
  -- Always populate base public profile
  v_name := coalesce(nullif(trim(NEW.raw_user_meta_data->>'name'), ''), 'Member');
  v_phone := nullif(trim(NEW.raw_user_meta_data->>'phone'), '');

  BEGIN
    INSERT INTO public.profiles (id, name, email, phone, state, language, created_at, updated_at)
    VALUES (
      NEW.id,
      v_name,
      NEW.email,
      v_phone,
      coalesce(NEW.raw_user_meta_data->>'state', ''),
      coalesce(NEW.raw_user_meta_data->>'language', 'English'),
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          email = EXCLUDED.email,
          updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Fail open for base profile to ensure GoTrue does not abort account creation
    RAISE WARNING 'RightAware: profiles insert notice: %', SQLERRM;
  END;

  v_path := lower(coalesce(NEW.raw_user_meta_data->>'path', 'user'));

  -- PATHWAY A: Legal Professional Application
  IF v_path = 'professional' THEN
    BEGIN
      -- Parse arrays defensively from JSON metadata
      v_specs := ARRAY[]::text[];
      IF jsonb_typeof(NEW.raw_user_meta_data->'specializations') = 'array' THEN
        FOR v_elem IN SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'specializations') LOOP
          IF trim(v_elem) <> '' THEN v_specs := array_append(v_specs, trim(v_elem)); END IF;
        END LOOP;
      END IF;

      v_langs := ARRAY['English']::text[];
      IF jsonb_typeof(NEW.raw_user_meta_data->'languages') = 'array' THEN
        v_langs := ARRAY[]::text[];
        FOR v_elem IN SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'languages') LOOP
          IF trim(v_elem) <> '' THEN v_langs := array_append(v_langs, trim(v_elem)); END IF;
        END LOOP;
      END IF;

      v_prof_id := 'prof-' || encode(gen_random_bytes(6), 'hex');

      -- Insert application row locked to NEW.id and 'pending' status
      INSERT INTO public.professionals (
        id, user_id, name, qualification, experience_yrs,
        location, languages, bio, consultation_options, fee_note,
        availability, verification_status, is_demo, rating_avg, ratings_count,
        created_at, updated_at
      ) VALUES (
        v_prof_id,
        NEW.id,
        v_name,
        coalesce(nullif(trim(NEW.raw_user_meta_data->>'qualification'), ''), 'Legal Practitioner'),
        nullif(trim(NEW.raw_user_meta_data->>'experience_yrs'), ''),
        coalesce(NEW.raw_user_meta_data->>'location', 'Lagos'),
        v_langs,
        coalesce(nullif(trim(NEW.raw_user_meta_data->>'bio'), ''), 'Application submitted via RightAware registration.'),
        v_specs,
        nullif(trim(NEW.raw_user_meta_data->>'fee_note'), ''),
        coalesce(NEW.raw_user_meta_data->>'availability', 'Open to new requests'),
        'pending', -- HARDCODED: client cannot forge verified status
        false,
        0,
        0,
        now(),
        now()
      ) ON CONFLICT DO NOTHING;

      -- Insert specializations child records if any
      IF array_length(v_specs, 1) > 0 THEN
        INSERT INTO public.professional_specializations (professional_id, specialization)
        SELECT v_prof_id, s FROM unnest(v_specs) AS s
        ON CONFLICT DO NOTHING;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Defensive boundary: log error without breaking GoTrue signup transaction
      RAISE WARNING 'RightAware: professional intake error: %', SQLERRM;
    END;

  -- PATHWAY B: Organisation Application
  ELSIF v_path = 'organisation' OR v_path = 'organization' THEN
    BEGIN
      v_services := ARRAY[]::text[];
      IF jsonb_typeof(NEW.raw_user_meta_data->'services') = 'array' THEN
        FOR v_elem IN SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'services') LOOP
          IF trim(v_elem) <> '' THEN v_services := array_append(v_services, trim(v_elem)); END IF;
        END LOOP;
      END IF;

      v_org_id := 'org-' || encode(gen_random_bytes(6), 'hex');

      INSERT INTO public.organizations (
        id, user_id, name, description, services, specialization,
        location, address, phone, email, website, verification_status,
        verification_source, source_note, created_at, updated_at
      ) VALUES (
        v_org_id,
        NEW.id,
        coalesce(nullif(trim(NEW.raw_user_meta_data->>'org_name'), ''), v_name),
        coalesce(nullif(trim(NEW.raw_user_meta_data->>'description'), ''), 'Organisation application submitted via signup.'),
        v_services,
        coalesce(NEW.raw_user_meta_data->>'specialization', 'Civil Society & Legal Aid'),
        coalesce(NEW.raw_user_meta_data->>'location', 'Lagos'),
        nullif(trim(NEW.raw_user_meta_data->>'address'), ''),
        v_phone,
        NEW.email,
        nullif(trim(NEW.raw_user_meta_data->>'website'), ''),
        'pending', -- HARDCODED: client cannot forge verified status
        nullif(trim(NEW.raw_user_meta_data->>'verification_source'), ''),
        'Registered via RightAware signup pathway',
        now(),
        now()
      ) ON CONFLICT DO NOTHING;

      -- Add user as owner in organization_members
      INSERT INTO public.organization_members (org_id, user_id, role)
      VALUES (v_org_id, NEW.id, 'owner')
      ON CONFLICT DO NOTHING;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'RightAware: organisation intake error: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tr_user_signup_intake ON auth.users;
CREATE TRIGGER tr_user_signup_intake
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_handle_user_signup_intake();

-- ============================================================================
-- 4. Seed Row Claiming Trigger (AFTER UPDATE OF email_confirmed_at)
-- ============================================================================
-- Only runs when email is cryptographically verified (email_confirmed_at IS NOT NULL).
-- Claims pre-existing institutional seed rows safely without allowing impostors.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tr_handle_user_email_confirmed_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id text;
BEGIN
  -- 1. Claim pre-existing unowned organization directory records
  FOR v_org_id IN 
    SELECT id FROM public.organizations
     WHERE lower(email) = lower(NEW.email)
       AND user_id IS NULL
  LOOP
    UPDATE public.organizations
       SET user_id = NEW.id,
           updated_at = now()
     WHERE id = v_org_id;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (v_org_id, NEW.id, 'owner')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END LOOP;

  -- 2. Claim pre-existing unowned professional directory records if any
  UPDATE public.professionals
     SET user_id = NEW.id,
         updated_at = now()
   WHERE lower(email) = lower(NEW.email)
     AND user_id IS NULL;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tr_user_email_confirmed_claim ON auth.users;
CREATE TRIGGER tr_user_email_confirmed_claim
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.tr_handle_user_email_confirmed_claim();
