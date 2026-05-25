-- ============================================================
-- Clear — Row Level Security policies
-- Apply via: Supabase dashboard → SQL Editor → run this file
-- ============================================================

-- Enable RLS on all tables
alter table groups             enable row level security;
alter table group_members      enable row level security;
alter table expenses           enable row level security;
alter table expense_splits     enable row level security;
alter table settlements        enable row level security;
alter table push_subscriptions enable row level security;


-- ── groups ───────────────────────────────────────────────────────────────────

create policy "groups: insert own" on groups
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "groups: select if member" on groups
  for select to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
    )
  );

create policy "groups: update if admin" on groups
  for update to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

create policy "groups: delete if admin" on groups
  for delete to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );


-- ── group_members ─────────────────────────────────────────────────────────────

create policy "group_members: select if member" on group_members
  for select to authenticated
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
    )
  );

create policy "group_members: insert" on group_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
  );

create policy "group_members: update if admin" on group_members
  for update to authenticated
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
  );

create policy "group_members: delete if admin" on group_members
  for delete to authenticated
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
  );


-- ── expenses ─────────────────────────────────────────────────────────────────

create policy "expenses: member access" on expenses
  for all to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = expenses.group_id
        and group_members.user_id = auth.uid()
    )
  );


-- ── expense_splits ────────────────────────────────────────────────────────────

create policy "expense_splits: member access" on expense_splits
  for all to authenticated
  using (
    exists (
      select 1 from expenses e
      join group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id
        and gm.user_id = auth.uid()
    )
  );


-- ── settlements ───────────────────────────────────────────────────────────────

create policy "settlements: member access" on settlements
  for all to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = settlements.group_id
        and group_members.user_id = auth.uid()
    )
  );


-- ── push_subscriptions ───────────────────────────────────────────────────────

create policy "Users manage own push subscriptions"
  on push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ── realtime ──────────────────────────────────────────────────────────────────
-- Run once to enable Realtime on all tables

alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table group_members;


-- ── storage: cover-photos bucket ─────────────────────────────────────────────
-- Run once after creating the cover-photos bucket in Supabase dashboard.
-- Bucket settings: Name = cover-photos | Public = Yes | File size limit = 5 MB

create policy "Authenticated users can upload cover photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cover-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public can read cover photos"
  on storage.objects for select to public
  using (bucket_id = 'cover-photos');

create policy "Users can delete their own cover photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cover-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── subscriptions ────────────────────────────────────────────────────────────

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- Users read only their own row; all writes are service-role only (server actions)
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());


-- ── indexes ───────────────────────────────────────────────────────────────────
-- Applied separately via drizzle/indexes.sql in Supabase SQL Editor.
-- Not managed by drizzle-kit — run indexes.sql once alongside this file.


-- ── expense_reactions ────────────────────────────────────────────────────────

alter table expense_reactions enable row level security;

-- Any group member can read, insert, update, or delete reactions within their group.
-- Ownership (only delete your own) is enforced in server actions.
create policy "reactions: member access" on expense_reactions
  for all to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = expense_reactions.group_id
        and group_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from group_members
      where group_members.group_id = expense_reactions.group_id
        and group_members.user_id = auth.uid()
    )
  );


-- ── expense_comments ──────────────────────────────────────────────────────────

alter table expense_comments enable row level security;

create policy "comments: member access" on expense_comments
  for all to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = expense_comments.group_id
        and group_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from group_members
      where group_members.group_id = expense_comments.group_id
        and group_members.user_id = auth.uid()
    )
  );


-- ── expense_disputes ──────────────────────────────────────────────────────────

alter table expense_disputes enable row level security;

create policy "disputes: member access" on expense_disputes
  for all to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = expense_disputes.group_id
        and group_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from group_members
      where group_members.group_id = expense_disputes.group_id
        and group_members.user_id = auth.uid()
    )
  );


-- ── display_name backfill ─────────────────────────────────────────────────────
-- Run once after first users join

-- update group_members set display_name = (
--   select raw_user_meta_data->>'full_name' from auth.users where auth.users.id = group_members.user_id
-- ) where user_id is not null and display_name is null;
