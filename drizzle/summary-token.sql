-- ============================================================
-- Clear — decouple the public summary link from the invite/join link
-- Apply via: Supabase dashboard → SQL Editor → run this file ONCE.
-- ============================================================
--
-- Previously /summary/[token] and /join/[token] both used groups.share_token, so
-- sharing a read-only trip recap silently granted JOIN access to the group.
-- summary_token is an independent UUID used only by /summary; share_token keeps
-- gating /join. Resetting the invite link no longer breaks the summary link.
--
-- IMPORTANT: run this BEFORE (or together with) deploying the matching code —
-- getGroupWithMembers selects every group column, so the app expects
-- summary_token to exist.

-- gen_random_uuid() is VOLATILE, so Postgres evaluates it per existing row when
-- adding the column → every group gets a distinct token (no manual backfill).
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS summary_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Unique index (idempotent). Existing rows already hold distinct values.
CREATE UNIQUE INDEX IF NOT EXISTS groups_summary_token_key ON groups (summary_token);
