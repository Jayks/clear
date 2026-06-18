import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Webhook dedup ledger (RAZORPAY_PLAN.md §3/§8). `eventId` (the
 * `x-razorpay-event-id` header) is the primary key, so dedup is a single
 * atomic `INSERT … ON CONFLICT (event_id) DO NOTHING` — skip processing the
 * event when the insert affects 0 rows. Never SELECT-then-INSERT (race
 * window — same bug class as the `ensureTrialStarted` R12-8 fix).
 */
export const razorpayWebhookEvents = pgTable("razorpay_webhook_events", {
  eventId: text("event_id").primaryKey(),
  paymentId: text("payment_id"), // for cross-checking entitlement application
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type RazorpayWebhookEvent = typeof razorpayWebhookEvents.$inferSelect;
export type NewRazorpayWebhookEvent = typeof razorpayWebhookEvents.$inferInsert;
