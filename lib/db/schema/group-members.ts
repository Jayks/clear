import { pgTable, uuid, text, timestamp, pgEnum, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";

export const memberRoleEnum = pgEnum("member_role", ["admin", "member"]);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    guestName: text("guest_name"),
    displayName: text("display_name"),
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    unique("unique_group_user").on(table.groupId, table.userId),
    check("exactly_one_of_user_or_guest", sql`(user_id IS NULL) <> (guest_name IS NULL)`),
  ]
);

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
