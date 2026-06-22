import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Persisted "recent activity" feed for /admin — logins, signups, purchases,
 * refunds. Platform-admin-only data; never read/written by Supabase anon/auth
 * clients (RLS enabled, no policies — same posture as `ai_usage`).
 *
 * `dedupKey` is nullable and only set by refund events (`refund:${refundId}`)
 * — Razorpay's `refund.created`/`refund.processed` are two distinct events
 * for the same refund, and the unique index on this column is what makes
 * recording (and notifying) exactly-once regardless of delivery order.
 * Postgres treats multiple NULLs as distinct, so login/signup/purchase rows
 * (which never set this) are unaffected.
 */
export const adminActivity = pgTable(
  "admin_activity",
  {
    id:        uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    type:      text("type").notNull(),       // 'login' | 'signup' | 'purchase' | 'refund' — text not enum, matches expenses.category convention
    userId:    uuid("user_id").notNull(),    // auth.users.id — no FK (cross-schema, matches stream_guests.created_by precedent)
    title:     text("title").notNull(),      // short label, e.g. "👤 New visit" — stored for fidelity even though the UI shows `body` + an icon instead
    body:      text("body").notNull(),       // detail line, e.g. "Jayakumar Sekar · Chennai, TN, IN · Windows/Chrome"
    dedupKey:  text("dedup_key"),            // nullable; only refund events set this — see comment above
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    dedupKeyUnq: uniqueIndex("admin_activity_dedup_key_unq").on(t.dedupKey),
  }),
);

export type AdminActivityType = "login" | "signup" | "purchase" | "refund";
export type AdminActivity = typeof adminActivity.$inferSelect;
