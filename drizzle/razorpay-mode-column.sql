-- Razorpay M5 prep: tag each payment with which credential mode (test/live)
-- created it, so test-mode smoke-testing never counts toward the live
-- early-bird slot count or lock-in check. Apply once in the Supabase SQL
-- Editor (pnpm db:push has the group_members CHECK bug — see CLAUDE.md).
--
-- Default 'test' is correct for ALL pre-existing rows — no live keys have
-- existed until now, so every historical payment genuinely was test-mode.
-- See RAZORPAY_PLAN.md §3/§5, D11.

ALTER TABLE razorpay_payments
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'test';
