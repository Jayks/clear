-- ============================================================
-- Clear — Guest Payment Requests
-- Run once in: Supabase dashboard → SQL Editor
-- ============================================================

-- ── 1. payment_requests table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token              uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Context (denormalized for public page render — no auth-protected DB joins needed)
  context_type       text NOT NULL CHECK (context_type IN ('circle', 'trip', 'nest')),
  group_id           uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  group_name         text NOT NULL,

  -- What's owed.
  -- NULLABLE: Flexi one-time circles (contribution_amount IS NULL) have no fixed amount —
  -- the page shows "contribute any amount" and the UPI link omits `am=`. All other
  -- contexts (recurring/Fixed circles, trip/nest settle suggestions) always set it.
  amount             numeric(12, 2),
  currency           text NOT NULL DEFAULT 'INR',
  description        text,              -- e.g. "June 2026 contribution", "Goa trip"

  -- Ghost (the one who owes / Flow A payer)
  payer_name         text NOT NULL,     -- guestName from group_members
  payer_member_id    uuid REFERENCES group_members(id) ON DELETE SET NULL,

  -- Recipient (the Clear user to notify + provide UPI to)
  payee_user_id      uuid NOT NULL,     -- auth.users.id
  payee_member_id    uuid REFERENCES group_members(id) ON DELETE SET NULL,
                                        -- group_members.id of the creditor;
                                        -- required for recordSettlement(toMemberId) on confirm
  payee_name         text NOT NULL,     -- denormalized
  payee_upi_id       text,              -- denormalized at generation time (stale OK — 7-day window)

  -- Circle-specific
  circle_period      text,              -- "2026-06" for recurring; NULL for one-time

  -- Status
  -- 'confirming' is a transient claim held by confirmExternalPayment while it writes the
  -- financial row. On success it advances to 'confirmed', on failure it rolls back to
  -- 'self_reported'. It exists only for the duration of one admin confirm action.
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'self_reported', 'confirming', 'confirmed', 'disputed')),
  payment_method     text CHECK (payment_method IN ('upi', 'cash', 'bank')),
  utr_reference      text,              -- optional transaction ID from ghost

  -- Back-references (filled in when admin confirms in-app)
  settlement_id      uuid REFERENCES settlements(id) ON DELETE SET NULL,
  contribution_id    uuid,              -- circle_contributions.id (soft ref — no FK, row may not exist yet)

  -- Audit
  created_by_user_id uuid NOT NULL,     -- admin who generated the request (auth.users.id)
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  self_reported_at   timestamptz,
  confirmed_at       timestamptz
);


-- ── 2. Dedup index ───────────────────────────────────────────────────────────
-- At most one LIVE (pending/self_reported) request per payer per PAYEE per period.
-- Prevents duplicate tokens when an admin re-taps "Send reminder".
--
-- payee_member_id MUST be in the key. A trip/nest ghost debtor can legitimately owe
-- SEVERAL creditors at once (the settle optimizer emits one suggestion per creditor).
-- Without payee_member_id, the key collapses to (group, payer) and the second request
-- is blocked / silently reuses the first one's token (wrong payee + amount).
-- For circles the payee is the single organiser, so the key still reduces to one-per-period.
--
-- COALESCE both nullable members to '' so the partial index treats a SET-NULL'd FK
-- consistently (NULLs are otherwise distinct in a unique index, defeating dedup).

CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_one_live_per_payer
  ON payment_requests (
    group_id,
    COALESCE(payer_member_id::text, ''),
    COALESCE(payee_member_id::text, ''),
    COALESCE(circle_period, '')
  )
  WHERE status IN ('pending', 'self_reported');


-- ── 3. RLS ───────────────────────────────────────────────────────────────────
-- Enable RLS but add NO public/anon policy.
-- The public /request/[token] page reads via the Drizzle direct connection, which
-- BYPASSES RLS (identical to how /stream/confirm/[token] reads stream_records — that
-- table has NO public SELECT policy either). A FOR SELECT USING (true) policy would
-- expose the ENTIRE table to any holder of the anon key (names, amounts, payee UPI
-- ids, payee user ids) — a data leak. Do NOT add one.

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- No policies. Anon/authenticated clients get zero rows via the Supabase JS client.
-- All reads (public page) + writes (self-report, confirm) go through server actions /
-- queries using the Drizzle service connection, which is not subject to RLS.
