import { pgTable, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * One row per user holding account-level (not per-group) preferences.
 * First and only field so far: the global "Email notifications" switch
 * (Settings → Notifications), added 2026-07-03 — default OFF, an
 * opt-in gate on top of the existing per-group `notifications_muted`
 * unsubscribe-link flag (see `lib/notifications/email-preference-gate.ts`
 * for how the two combine). A missing row (a user who has never touched
 * the toggle) is treated as OFF by the query layer — no need to backfill
 * a row for every existing user.
 */
export const userPreferences = pgTable("user_preferences", {
  userId:                    uuid("user_id").primaryKey(), // auth.users.id, no FK (cross-schema — matches notifications/admin_activity precedent)
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(false),
  createdAt:                 timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:                 timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
