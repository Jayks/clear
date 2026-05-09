import { pgTable, uuid, text, timestamp, date, numeric, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  coverPhotoUrl: text("cover_photo_url"),
  defaultCurrency: text("default_currency").notNull().default("INR"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdBy: uuid("created_by").notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  itinerary: text("itinerary"),
  isArchived: boolean("is_archived").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  shareToken: uuid("share_token").notNull().unique().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
