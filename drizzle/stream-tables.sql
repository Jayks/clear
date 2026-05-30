-- ============================================================
-- Clear Stream — Table creation + RLS + Indexes
-- Run once in: Supabase dashboard → SQL Editor
-- Order matters: stream_guests first, stream_records second,
-- stream_settlements third (FK chain).
-- ============================================================


-- ── stream_guests ─────────────────────────────────────────────────────────────
-- Non-Clear-account people that a user logs Streams against.

CREATE TABLE IF NOT EXISTS stream_guests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid        NOT NULL,   -- auth.users.id
  name        text        NOT NULL,
  email       text,
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ── stream_records ────────────────────────────────────────────────────────────
-- Core Stream entry. One row = one bilateral debt moment.
-- direction is always from creator's perspective:
--   'they_owe_me' — counterpart owes the creator
--   'i_owe_them'  — creator owes the counterpart

CREATE TABLE IF NOT EXISTS stream_records (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id              uuid        NOT NULL,              -- auth.users.id
  counterpart_id          uuid,                              -- auth.users.id (Clear user)
  counterpart_guest_id    uuid        REFERENCES stream_guests(id) ON DELETE CASCADE,
  amount                  numeric(12,2) NOT NULL,
  currency                text        NOT NULL DEFAULT 'INR',
  direction               text        NOT NULL,              -- 'they_owe_me' | 'i_owe_them'
  note                    text,
  status                  text        NOT NULL DEFAULT 'pending',
  -- Guest confirmation token — one-time link, 48 hr expiry set in server action
  confirm_token           uuid        UNIQUE DEFAULT gen_random_uuid(),
  confirm_token_expires_at timestamptz,
  confirmed_at            timestamptz,
  -- Dispute fields
  disputed_at             timestamptz,
  dispute_reason          text,       -- 'wrong_amount'|'already_paid'|'dont_recognize'|'other'
  dispute_note            text,
  -- Settlement
  settled_at              timestamptz,
  -- Forgiveness (private — counterpart never notified)
  forgiven_at             timestamptz,
  forgiven_note           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  -- Exactly one counterpart type must be set
  CONSTRAINT stream_records_counterpart_xor CHECK (
    (counterpart_id IS NOT NULL AND counterpart_guest_id IS NULL)
    OR
    (counterpart_id IS NULL AND counterpart_guest_id IS NOT NULL)
  ),
  -- Prevent self-streams
  CONSTRAINT stream_records_no_self CHECK (
    creator_id <> COALESCE(counterpart_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
);


-- ── stream_settlements ────────────────────────────────────────────────────────
-- Partial or full payments against a stream_record.
-- Multiple rows allowed per stream (partial payments over time).

CREATE TABLE IF NOT EXISTS stream_settlements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id   uuid        NOT NULL REFERENCES stream_records(id) ON DELETE CASCADE,
  amount      numeric(12,2) NOT NULL,
  currency    text        NOT NULL DEFAULT 'INR',
  note        text,
  recorded_by uuid        NOT NULL,  -- auth.users.id
  settled_at  timestamptz NOT NULL DEFAULT now()
);


-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE stream_guests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_settlements ENABLE ROW LEVEL SECURITY;


-- stream_guests: owner only
CREATE POLICY "stream_guests: owner access" ON stream_guests
  FOR ALL TO authenticated
  USING  (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());


-- stream_records: creator has full access
CREATE POLICY "stream_records: creator access" ON stream_records
  FOR ALL TO authenticated
  USING  (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- stream_records: Clear-user counterpart can read + update status only
CREATE POLICY "stream_records: counterpart read" ON stream_records
  FOR SELECT TO authenticated
  USING (counterpart_id = auth.uid());

CREATE POLICY "stream_records: counterpart update" ON stream_records
  FOR UPDATE TO authenticated
  USING (counterpart_id = auth.uid());


-- stream_settlements: parties can read; recorded_by can insert
CREATE POLICY "stream_settlements: party read" ON stream_settlements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stream_records sr
      WHERE sr.id = stream_settlements.stream_id
        AND (sr.creator_id = auth.uid() OR sr.counterpart_id = auth.uid())
    )
  );

CREATE POLICY "stream_settlements: recorder insert" ON stream_settlements
  FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "stream_settlements: recorder delete" ON stream_settlements
  FOR DELETE TO authenticated
  USING (recorded_by = auth.uid());


-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_stream_records_creator
  ON stream_records(creator_id);

CREATE INDEX IF NOT EXISTS idx_stream_records_counterpart
  ON stream_records(counterpart_id)
  WHERE counterpart_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stream_records_confirm_token
  ON stream_records(confirm_token)
  WHERE confirm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stream_records_status
  ON stream_records(status);

CREATE INDEX IF NOT EXISTS idx_stream_settlements_stream_id
  ON stream_settlements(stream_id);

CREATE INDEX IF NOT EXISTS idx_stream_guests_created_by
  ON stream_guests(created_by);
