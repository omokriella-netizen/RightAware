-- RightAware — add professionals.application_ref (ADDITIVE, idempotent).
-- Run ONCE in the Supabase SQL editor (SQL > New query > paste > Run).
--
-- WHY THIS IS REQUIRED (Phase 1 audit, blocker B1):
--   professional.html selects professionals.application_ref in its own-row
--   column list (professional.html:207) and renders it in the status card
--   (:149) and the Overview stat (:295). The column does not exist in the live
--   database — read-only probe on 2026-10-03 answered:
--     select application_ref from professionals limit 1
--     -> 400 / 42703 "column professionals.application_ref does not exist"
--   so the own-row read fails and the professional workspace cannot load its
--   own record.
--
-- WHY THIS FILE IS SAFE AGAINST ANY CURRENT STATE:
--   * guarded by information_schema: the column is added only when missing —
--     if it already exists the block is a no-op, so it can be run without
--     checking first and never duplicates a column;
--   * nullable text with NO default: a metadata-only change (no table rewrite,
--     no backfill, instant regardless of table size);
--   * touches no existing row, table, policy, grant, function or trigger;
--   * existing rows keep NULL and the UI renders them as "—".
--
-- Run order: standalone (no dependency on any other file). Do NOT re-run the
-- base schema or any already-applied migration for this change.

do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'professionals'
       and column_name  = 'application_ref'
  ) then
    alter table public.professionals add column application_ref text;
  end if;
end $$;
