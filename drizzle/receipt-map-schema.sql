-- ============================================================
-- Smart Receipt + Map View — DB migration
-- Apply via: Supabase dashboard → SQL Editor → run this file
-- NEVER run via pnpm db:push (drizzle-kit CHECK constraint bug)
-- ============================================================

-- ── expenses table — 4 new columns ───────────────────────────────────────────

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS location            jsonb,
  ADD COLUMN IF NOT EXISTS receipt_url         text,
  ADD COLUMN IF NOT EXISTS receipt_items       jsonb,
  ADD COLUMN IF NOT EXISTS receipt_scanned_at  timestamptz;

-- Partial index: only expenses WITH a location (tiny footprint).
-- Used by the Map view "hasLocatedExpenses" lean query and by the map data fetch.
CREATE INDEX IF NOT EXISTS idx_expenses_location_group
  ON expenses (group_id, expense_date)
  WHERE location IS NOT NULL;

-- ── receipt-photos storage bucket ─────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-photos', 'receipt-photos', true)
ON CONFLICT (id) DO NOTHING;
