-- M-1 fix: prevent duplicate guest members within a group (case-insensitive).
--
-- addGuestMember does a SELECT-then-INSERT to reject duplicate names, but the two
-- statements are not atomic — a double-tap, or two concurrent admin tabs, can both
-- pass the read and both insert, leaving two identical guest rows. A unique index is
-- the only race-proof guard. It is PARTIAL (guest_name IS NOT NULL) so it never
-- constrains Clear-user member rows (which carry user_id, not guest_name), and it
-- lowercases the name so "Alice" and "alice" collide.
--
-- Apply ONCE in the Supabase SQL Editor — `pnpm db:push` has the known drizzle-kit
-- bug with the group_members CHECK constraint, so this is not pushed automatically.
-- Drizzle's pgTable cannot express a partial lower() unique index, so it lives here
-- rather than in lib/db/schema/group-members.ts.
--
-- NOTE: if duplicate guest rows already exist they must be de-duplicated before this
-- index will create. To find them:
--   SELECT group_id, lower(guest_name), count(*)
--   FROM group_members WHERE guest_name IS NOT NULL
--   GROUP BY group_id, lower(guest_name) HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS group_members_group_guest_name_unq
  ON group_members (group_id, lower(guest_name))
  WHERE guest_name IS NOT NULL;
