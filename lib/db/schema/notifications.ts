import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";

/**
 * Persisted in-app notification inbox — the user-facing mirror of
 * `admin_activity` (see `lib/db/schema/admin-activity.ts`). Every event that
 * would otherwise only exist as a transient push/toast (contribution
 * pending, dispute raised, settlement confirmed, …) also gets a row here so
 * there's a durable "what did I miss" surface, independent of whether the
 * push actually landed (iOS Safari non-installed PWA, notification
 * permission denied, tab was closed, etc.).
 *
 * `dedupKey` follows the exact same nullable-unique-index pattern as
 * `admin_activity.dedup_key` — used by events that could double-fire for the
 * same underlying occurrence (e.g. the trip-wrap-up lazy check-on-visit,
 * keyed `trip_wrapup:${groupId}`, must only ever notify once per trip).
 * Postgres treats multiple NULLs as distinct, so events with no dedup
 * key (the majority) are unaffected.
 */
export const notifications = pgTable(
  "notifications",
  {
    id:        uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId:    uuid("user_id").notNull(),   // recipient — auth.users.id, no FK (cross-schema, matches admin_activity/stream_guests precedent)
    groupId:   uuid("group_id").references(() => groups.id, { onDelete: "cascade" }), // null for account-level events
    type:      text("type").notNull(),      // NotificationType — text not enum, matches expenses.category convention
    title:     text("title").notNull(),
    body:      text("body").notNull(),
    url:       text("url").notNull(),       // deep link opened when the notification row is tapped
    dedupKey:  text("dedup_key"),
    readAt:    timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    dedupKeyUnq:      uniqueIndex("notifications_dedup_key_unq").on(t.dedupKey),
    userCreatedIdx:   index("notifications_user_created_idx").on(t.userId, t.createdAt),
    userReadIdx:      index("notifications_user_read_idx").on(t.userId, t.readAt),
  }),
);

export type NotificationType =
  | "contribution_pending"
  | "contribution_confirmed"
  | "contribution_disputed"
  | "stream_entry_logged"
  | "stream_settle_pending"
  | "stream_settle_confirmed"
  | "stream_disputed"
  | "expense_added"
  | "expense_mention"
  | "expense_comment"
  | "dispute_raised"
  | "dispute_resolved"
  | "settlement_recorded"
  | "trip_wrapup";

export type Notification = typeof notifications.$inferSelect;
