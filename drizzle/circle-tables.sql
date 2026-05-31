-- ============================================================
-- Clear Circle — Schema migration
-- Run once in: Supabase dashboard → SQL Editor
-- Order: enum → groups columns → circle_contributions table → RLS → indexes
-- ============================================================


-- ── 1. Extend group_type enum ─────────────────────────────────────────────────

ALTER TYPE group_type ADD VALUE IF NOT EXISTS 'circle';


-- ── 2. Add circle columns to groups ──────────────────────────────────────────

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS circle_mode           text,              -- 'recurring' | 'goal'
  ADD COLUMN IF NOT EXISTS contribution_amount   numeric(12,2),     -- fixed per-person amount
  ADD COLUMN IF NOT EXISTS contribution_period   text,              -- 'monthly' (recurring only)
  ADD COLUMN IF NOT EXISTS contribution_day      int,               -- 1–28: day of month due
  ADD COLUMN IF NOT EXISTS target_amount         numeric(12,2),     -- total goal target (goal only)
  ADD COLUMN IF NOT EXISTS event_date            date,              -- deadline (goal only)
  ADD COLUMN IF NOT EXISTS circle_status         text DEFAULT 'active',   -- 'active'|'purchased'|'complete'
  ADD COLUMN IF NOT EXISTS upi_id                text,              -- organiser UPI ID for Pay Now link
  ADD COLUMN IF NOT EXISTS contribution_privacy  text DEFAULT 'public';   -- 'public'|'admin_only' (goal only)


-- ── 3. circle_contributions table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS circle_contributions (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid         NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id    uuid         NOT NULL REFERENCES group_members(id),
  amount       numeric(12,2) NOT NULL,
  currency     text         NOT NULL DEFAULT 'INR',
  period       text,                     -- "2026-06" for recurring; null for goal mode
  recorded_by  uuid,                     -- auth.users.id who logged it (null = self-reported)
  note         text,
  created_at   timestamptz  NOT NULL DEFAULT now()
);


-- ── 4. Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE circle_contributions ENABLE ROW LEVEL SECURITY;


-- ── 5. RLS policies ──────────────────────────────────────────────────────────

-- All group members can read contributions
CREATE POLICY "circle_contributions: member read"
  ON circle_contributions FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Admin members can insert contributions
CREATE POLICY "circle_contributions: admin insert"
  ON circle_contributions FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin members can update contributions
CREATE POLICY "circle_contributions: admin update"
  ON circle_contributions FOR UPDATE TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin members can delete contributions
CREATE POLICY "circle_contributions: admin delete"
  ON circle_contributions FOR DELETE TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );


-- ── 6. Realtime publication ───────────────────────────────────────────────────

-- Only run if you want live circle dashboard updates (pool balance, chip grid)
-- ALTER PUBLICATION supabase_realtime ADD TABLE circle_contributions;


-- ── 7. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_circle_contributions_group_id
  ON circle_contributions(group_id);

CREATE INDEX IF NOT EXISTS idx_circle_contributions_member_id
  ON circle_contributions(member_id);

CREATE INDEX IF NOT EXISTS idx_circle_contributions_period
  ON circle_contributions(group_id, period)
  WHERE period IS NOT NULL;