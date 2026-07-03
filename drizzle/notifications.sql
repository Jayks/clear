-- notifications — persisted in-app notification inbox (user-facing mirror of
-- admin_activity). Apply once in the Supabase SQL Editor (pnpm db:push has
-- the group_members CHECK bug — see root CLAUDE.md §7).

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  group_id   uuid references groups(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null,
  url        text not null,
  dedup_key  text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on notifications (user_id, created_at desc);
create index if not exists notifications_user_read_idx on notifications (user_id, read_at);

-- Multiple NULLs are distinct under a unique index in Postgres, so this only
-- constrains events that actually set dedup_key (e.g. trip_wrapup) — the
-- majority of event types (no dedup key) are completely unaffected.
create unique index if not exists notifications_dedup_key_unq on notifications (dedup_key);

-- Unlike admin_activity/ai_usage (service-role/Drizzle-only access), this
-- table IS read directly by the inbox UI for the current user, so it needs a
-- real per-user RLS policy — same posture as push_subscriptions.
alter table notifications enable row level security;

create policy "notifications: user manages own rows"
  on notifications for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
