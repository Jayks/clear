import { pgTable, uuid, text, timestamp, date, numeric, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const groupTypeEnum = pgEnum("group_type", ["trip", "nest", "circle"]);

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
  // Separate from shareToken: the invite/join link (shareToken) must NOT double as
  // the public read-only summary link. summaryToken gates /summary/[token] only.
  summaryToken: uuid("summary_token").notNull().unique().default(sql`gen_random_uuid()`),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),

  // ── Circle-specific columns ────────────────────────────────────────────────
  circleMode: text("circle_mode"),              // 'recurring' | 'one_time'
  contributionAmount: numeric("contribution_amount", { precision: 12, scale: 2 }),
  contributionPeriod: text("contribution_period"),  // 'monthly'
  contributionDay: integer("contribution_day"),      // 1–28: day of month due
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }),
  eventDate: date("event_date"),
  circleStatus: text("circle_status"),              // 'active' | 'purchased' | 'complete'
  upiId: text("upi_id"),
  contributionPrivacy: text("contribution_privacy"), // 'public' | 'admin_only'
  walletExpensesEnabled: boolean("wallet_expenses_enabled").notNull().default(true),
});

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
