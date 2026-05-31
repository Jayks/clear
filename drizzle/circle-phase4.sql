-- Circle Phase 4: add is_advance column to expenses
-- Run once in Supabase SQL Editor

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS is_advance boolean NOT NULL DEFAULT false;
