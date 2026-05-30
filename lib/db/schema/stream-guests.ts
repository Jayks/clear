import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Non-Clear-account people that a user logs Streams against.
 * Created by the logger (created_by) when the counterpart has no app account.
 * email / phone are optional — used to send the guest confirmation link.
 */
export const streamGuests = pgTable("stream_guests", {
  id:        uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdBy: uuid("created_by").notNull(),   // auth.users.id — no cross-schema FK
  name:      text("name").notNull(),
  email:     text("email"),
  phone:     text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type StreamGuest    = typeof streamGuests.$inferSelect;
export type NewStreamGuest = typeof streamGuests.$inferInsert;
