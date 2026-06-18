-- Razorpay M2: payment ledger + webhook dedup + subscription columns.
-- Apply once in the Supabase SQL Editor (pnpm db:push has the group_members
-- CHECK bug — see CLAUDE.md). Mirrors lib/db/schema/{subscriptions,
-- razorpay-payments,razorpay-webhook-events}.ts. See RAZORPAY_PLAN.md §3.

-- ── subscriptions: new columns for the pass-purchase flow ────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_customer_id text,
  ADD COLUMN IF NOT EXISTS last_payment_id text,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;

-- ── razorpay_payments: append-only ledger AND the idempotency mechanism ──────
-- (payment_id UNIQUE is what makes "apply this payment exactly once" race-proof
-- under concurrent client-callback + webhook-backstop calls — see schema file.)
create table if not exists razorpay_payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  payment_id  text not null,
  order_id    text not null,
  amount      integer not null,        -- paise
  pass_type   text not null,           -- 'pass_30d' | 'annual'
  early_bird  boolean not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists razorpay_payments_payment_id_unq on razorpay_payments (payment_id);

-- ── razorpay_webhook_events: dedup ledger ─────────────────────────────────────
create table if not exists razorpay_webhook_events (
  event_id     text primary key,       -- x-razorpay-event-id header
  payment_id   text,
  type         text not null,
  processed_at timestamptz not null default now()
);

-- Both tables: accessed only by server actions/the webhook route via the
-- Drizzle (direct Postgres) connection, which bypasses RLS. Enable RLS with
-- NO policies so the Supabase anon/auth clients can never read or write them
-- — same pattern as ai_usage.
alter table razorpay_payments enable row level security;
alter table razorpay_webhook_events enable row level security;
