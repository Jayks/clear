-- ============================================================
-- Trip Photos — schema, index, and RLS
-- Apply via: Supabase dashboard → SQL Editor → run this file
-- ============================================================

-- 1. Add photo_album_url column to groups (idempotent)
alter table groups add column if not exists photo_album_url text;

-- 2. Create trip_photos table
create table if not exists trip_photos (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  member_id     uuid references group_members(id) on delete set null,
  storage_path  text not null,
  public_url    text not null,
  caption       text,
  display_order smallint default 0,
  created_at    timestamptz default now()
);

-- 3. Index for fast group photo lookups
create index if not exists trip_photos_group_id_idx
  on trip_photos(group_id, display_order, created_at);

-- 4. Enable RLS
alter table trip_photos enable row level security;

-- 5. Select policy — any group member may view photos
create policy "trip_photos_select" on trip_photos
  for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = trip_photos.group_id
        and group_members.user_id  = auth.uid()
    )
  );

-- Insert / Delete are handled server-side via service role; no client-direct RLS needed.
