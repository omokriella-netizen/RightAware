-- RightAware — dashboard access (additive). Run ONCE in the Supabase SQL
-- editor (SQL > New query > paste > Run). Safe to re-run (drop-if-exists /
-- create-or-replace / on-conflict everywhere).
-- Run AFTER applications-access.sql, verification-states.sql and
-- verification-revoke.sql (all already applied — do NOT re-run them).
--
-- WHY THIS EXISTS
--   The verified Professional / Organization dashboards (professional.html,
--   organization.html) read through existing RLS (own_profs, own_orgs,
--   pub_read_*, own_notif) but need three things the base schema does not
--   provide:
--     1) an owner-locked way to EDIT their own profile row — direct-table
--        UPDATE on professionals/organizations stays editor/admin-only, and a
--        row-level policy cannot restrict *columns*; so, mirroring the existing
--        ra_approve_* design, edits go through security-definer functions with
--        explicit column whitelists;
--     2) a SELECT policy so a professional can read consultation requests
--        addressed to their own record (clients already read their side via
--        the existing own_cons policy);
--     3) storage write policies so the owner can upload their own profile
--        photo / organization logo into the public photo buckets — own folder
--        only, image types only.
--
-- WHAT IT DOES NOT DO
--   * does not re-run the schema, does not alter any table, CHECK or column;
--   * does not change any existing policy (only NEW policy names);
--   * grants nothing to the anon role — every function is revoked from PUBLIC/anon and
--     granted to authenticated only;
--   * never writes verification_status, verification_source, verified_at,
--     is_demo, rating_avg, ratings_count, user_id, id or e-mail — those are
--     not in either whitelist, so they are unreachable through these calls;
--   * public exposure is unchanged: anonymous readers still see only
--     verification_status='verified' rows, exactly as before.

-- ---------------------------------------------------------------------------
-- 1. Professional self-edit: ra_update_own_professional(...)
--    Ownership is checked inside the function (auth.uid() = user_id); the
--    SECURITY DEFINER body runs as the function owner, so the update succeeds
--    without loosening any row-level security policy.
-- ---------------------------------------------------------------------------
create or replace function public.ra_update_own_professional(
  p_id text,
  p_name text,
  p_photo_path text,
  p_qualification text,
  p_experience_yrs text,
  p_location text,
  p_languages text[],
  p_bio text,
  p_consultation_options text[],
  p_fee_note text,
  p_availability text,
  p_specs text[]
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_old_photo text;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if coalesce(trim(coalesce(p_name, '')), '') = '' then
    raise exception 'name is required';
  end if;
  select photo_path into v_old_photo
    from public.professionals where id = p_id and user_id = v_uid;
  if not found then
    raise exception 'not your row';
  end if;
  -- A photo path must point into this account's own upload folder (or stay
  -- unchanged), so a crafted call can never plant someone else's file.
  if p_photo_path is distinct from v_old_photo
     and (p_photo_path is null
          or left(p_photo_path, length(v_uid::text) + 1) <> v_uid::text || '/') then
    raise exception 'photo path must come from your own uploads';
  end if;
  update public.professionals
     set name                  = p_name,
         photo_path            = p_photo_path,
         qualification         = p_qualification,
         experience_yrs        = p_experience_yrs,
         location              = p_location,
         languages             = coalesce(p_languages, '{}'::text[]),
         bio                   = p_bio,
         consultation_options  = coalesce(p_consultation_options, '{}'::text[]),
         fee_note              = p_fee_note,
         availability          = p_availability,
         updated_at            = now()
   where id = p_id and user_id = v_uid;
  -- Specializations are child rows of the owner's record: replace them in the
  -- same transaction (whitelist-managed; the parent row check above already
  -- proved ownership).
  delete from public.professional_specializations where professional_id = p_id;
  insert into public.professional_specializations (professional_id, specialization)
  select p_id, trim(s)
    from unnest(coalesce(p_specs, '{}'::text[])) as t(s)
   where trim(s) <> ''
  on conflict do nothing;
  return (select to_jsonb(p) from public.professionals p where p.id = p_id);
end $$;

revoke execute on function public.ra_update_own_professional(text,text,text,text,text,text,text[],text,text[],text,text,text[]) from public, anon;
grant  execute on function public.ra_update_own_professional(text,text,text,text,text,text,text[],text,text[],text,text,text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Organization self-edit: ra_update_own_organization(...)
--    Ownership = the caller's JWT e-mail matches the row's e-mail — the exact
--    binding own_orgs already uses (organizations carry no user_id column, so
--    no schema change is introduced here either).
-- ---------------------------------------------------------------------------
create or replace function public.ra_update_own_organization(
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
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_old_logo text;
begin
  if v_uid is null or v_email = '' then
    raise exception 'not signed in';
  end if;
  if coalesce(trim(coalesce(p_name, '')), '') = '' then
    raise exception 'name is required';
  end if;
  select logo_path into v_old_logo
    from public.organizations where id = p_id and lower(email) = v_email;
  if not found then
    raise exception 'not your row';
  end if;
  if p_logo_path is distinct from v_old_logo
     and (p_logo_path is null
          or left(p_logo_path, length(v_uid::text) + 1) <> v_uid::text || '/') then
    raise exception 'logo path must come from your own uploads';
  end if;
  update public.organizations
     set name           = p_name,
         logo_path      = p_logo_path,
         description    = p_description,
         services       = coalesce(p_services, '{}'::text[]),
         specialization = p_specialization,
         location       = p_location,
         address        = p_address,
         phone          = p_phone,
         website        = p_website,
         updated_at     = now()
   where id = p_id and lower(email) = v_email;
  return (select to_jsonb(o) from public.organizations o where o.id = p_id);
end $$;

revoke execute on function public.ra_update_own_organization(text,text,text,text,text[],text,text,text,text,text) from public, anon;
grant  execute on function public.ra_update_own_organization(text,text,text,text,text[],text,text,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Professionals read the consultations addressed to their own record.
--    NEW policy name (existing own_cons for the client side is untouched —
--    permissive policies combine with OR, so nothing that works today stops
--    working). Read-only, authenticated only, and further restricted to a
--    VERIFIED record: an unverified/rejected professional gains no
--    verified-professional read from this policy. Note for roadmap item 3:
--    tightening own_cons WITH CHECK (so a client cannot point a new request at
--    someone else's record) belongs with the consultation workflow itself and
--    is deliberately NOT changed here.
-- ---------------------------------------------------------------------------
drop policy if exists pro_read_consultations on public.consultations;
create policy pro_read_consultations on public.consultations
  for select to authenticated
  using (professional_id in (
    select p.id from public.professionals p
    where p.user_id = auth.uid()
      and p.verification_status = 'verified'
  ));

-- ---------------------------------------------------------------------------
-- 4. Profile photo / organization logo uploads: owner-folder-only writes in
--    the public read buckets (the buckets themselves are documented in
--    docs/SETUP.md and are created below if missing). Public READ of these
--    buckets already works — only writes need policies, and each write is
--    confined to the caller's own UUID folder with an image-type check.
--    File size (2 MB) is enforced client-side before the upload starts.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pro-photos', 'pro-photos', true), ('org-logos', 'org-logos', true)
on conflict (id) do nothing;
update storage.buckets set public = true
 where id in ('pro-photos', 'org-logos') and public is distinct from true;

drop policy if exists own_photo_folder_insert on storage.objects;
create policy own_photo_folder_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('pro-photos', 'org-logos')
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(name) ~ '\.(jpg|jpeg|png|webp|gif)$'
  );

drop policy if exists own_photo_folder_update on storage.objects;
create policy own_photo_folder_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('pro-photos', 'org-logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('pro-photos', 'org-logos')
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(name) ~ '\.(jpg|jpeg|png|webp|gif)$'
  );

drop policy if exists own_photo_folder_delete on storage.objects;
create policy own_photo_folder_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('pro-photos', 'org-logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- After running this file you do NOT need to re-run the schema.
