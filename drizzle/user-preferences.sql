-- user_preferences — account-level (not per-group) user preferences.
-- Apply once in the Supabase SQL Editor (pnpm db:push has the group_members
-- CHECK bug — see root CLAUDE.md §7).

create table if not exists user_preferences (
  user_id                      uuid primary key,
  email_notifications_enabled  boolean not null default false,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

-- Read/written directly by the Settings page for the current user, so it
-- needs a real per-user RLS policy — same posture as notifications/push_subscriptions.
alter table user_preferences enable row level security;

create policy "user_preferences: user manages own row"
  on user_preferences for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
