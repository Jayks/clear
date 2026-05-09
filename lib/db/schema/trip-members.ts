import { pgTable, uuid, text, timestamp, pgEnum, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { trips } from "./trips";

export const memberRoleEnum = pgEnum("member_role", ["admin", "member"]);

export const tripMembers = pgTable(
  "trip_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    guestName: text("guest_name"),
    displayName: text("display_name"), // populated for real users at join time
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    unique("unique_trip_user").on(table.tripId, table.userId),
    check("exactly_one_of_user_or_guest", sql`(user_id IS NULL) <> (guest_name IS NULL)`),
  ]
);

export type TripMember = typeof tripMembers.$inferSelect;
export type NewTripMember = typeof tripMembers.$inferInsert;
