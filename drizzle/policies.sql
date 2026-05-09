-- ============================================================
-- Wayfare — Row Level Security policies
-- Apply via: Supabase dashboard → SQL Editor → run this file
-- ============================================================

-- Enable RLS on all tables
alter table trips           enable row level security;
alter table trip_members    enable row level security;
alter table expenses        enable row level security;
alter table expense_splits  enable row level security;
alter table settlements     enable row level security;


-- ── trips ────────────────────────────────────────────────────────────────────

create policy "trips: insert own" on trips
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "trips: select if member" on trips
  for select to authenticated
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
        and trip_members.user_id = auth.uid()
    )
  );

create policy "trips: update if admin" on trips
  for update to authenticated
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
        and trip_members.user_id = auth.uid()
        and trip_members.role = 'admin'
    )
  );

create policy "trips: delete if admin" on trips
  for delete to authenticated
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
        and trip_members.user_id = auth.uid()
        and trip_members.role = 'admin'
    )
  );


-- ── trip_members ─────────────────────────────────────────────────────────────

create policy "trip_members: select if member" on trip_members
  for select to authenticated
  using (
    exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
    )
  );

create policy "trip_members: insert" on trip_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
        and tm.role = 'admin'
    )
  );

create policy "trip_members: delete if admin" on trip_members
  for delete to authenticated
  using (
    exists (
      select 1 from trip_members tm
      where tm.trip_id = trip_members.trip_id
        and tm.user_id = auth.uid()
        and tm.role = 'admin'
    )
  );


  -- ── expenses ─────────────────────────────────────────────────────────────────

  create policy "expenses: member access" on expenses
    for all to authenticated
    using (
      exists (
        select 1 from trip_members
        where trip_members.trip_id = expenses.trip_id
          and trip_members.user_id = auth.uid()
      )
    );


  -- ── expense_splits ────────────────────────────────────────────────────────────

  create policy "expense_splits: member access" on expense_splits
    for all to authenticated
    using (
      exists (
        select 1 from expenses e
        join trip_members tm on tm.trip_id = e.trip_id
        where e.id = expense_splits.expense_id
          and tm.user_id = auth.uid()
      )
    );


  -- ── settlements ───────────────────────────────────────────────────────────────

  create policy "settlements: member access" on settlements
    for all to authenticated
    using (
      exists (
        select 1 from trip_members
        where trip_members.trip_id = settlements.trip_id
          and trip_members.user_id = auth.uid()
      )
    );
