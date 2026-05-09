import { pgTable, uuid, text, timestamp, date, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const groupTypeEnum = pgEnum("group_type", ["trip", "nest"]);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  groupType: groupTypeEnum("group_type").notNull().default("trip"),
  coverPhotoUrl: text("cover_photo_url"),
  defaultCurrency: text("default_currency").notNull().default("INR"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  itinerary: text("itinerary"),
  isArchived: boolean("is_archived").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  shareToken: uuid("share_token").notNull().unique().default(sql`gen_random_uuid()`),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
