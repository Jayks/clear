-- ai_usage — per-user monthly logging-AI counter (silent abuse ceiling).
-- Apply once in the Supabase SQL Editor (pnpm db:push has the group_members CHECK bug).

create table if not exists ai_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  period     text not null,            -- 'YYYY-MM'
  count      integer not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_usage_user_period_unq on ai_usage (user_id, period);

-- Accessed only by server actions via the Drizzle (direct Postgres) connection,
-- which bypasses RLS. Enable RLS with NO policies so the Supabase anon/auth
-- clients can never read or write it.
alter table ai_usage enable row level security;
