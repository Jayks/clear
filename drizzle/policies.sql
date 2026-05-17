-- ============================================================
-- Clear — Row Level Security policies
-- Apply via: Supabase dashboard → SQL Editor → run this file
-- ============================================================

-- Enable RLS on all tables
alter table groups          enable row level security;
alter table group_members   enable row level security;
alter table expenses        enable row level security;
alter table expense_splits  enable row level security;
alter table settlements     enable row level security;


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


-- ── indexes ───────────────────────────────────────────────────────────────────
-- Applied separately via drizzle/indexes.sql in Supabase SQL Editor.
-- Not managed by drizzle-kit — run indexes.sql once alongside this file.


-- ── display_name backfill ─────────────────────────────────────────────────────
-- Run once after first users join

-- update group_members set display_name = (
--   select raw_user_meta_data->>'full_name' from auth.users where auth.users.id = group_members.user_id
-- ) where user_id is not null and display_name is null;
