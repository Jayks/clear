-- admin_activity — persisted "recent activity" feed for /admin (logins,
-- signups, purchases, refunds). Apply once in the Supabase SQL Editor
-- (pnpm db:push has the group_members CHECK bug).

create table if not exists admin_activity (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  user_id    uuid not null,
  title      text not null,
  body       text not null,
  dedup_key  text,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_created_at_idx on admin_activity (created_at desc);

-- Multiple NULLs are distinct under a unique index in Postgres, so this only
-- constrains rows that actually set dedup_key (refund events) — login/signup/
-- purchase rows (dedup_key always NULL) are completely unaffected.
create unique index if not exists admin_activity_dedup_key_unq on admin_activity (dedup_key);

-- Accessed only by server actions via the Drizzle (direct Postgres) connection,
-- which bypasses RLS. Enable RLS with NO policies — same posture as ai_usage —
-- so the Supabase anon/auth clients can never read or write it.
alter table admin_activity enable row level security;
