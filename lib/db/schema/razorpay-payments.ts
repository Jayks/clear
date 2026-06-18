import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Append-only payment ledger — and the idempotency mechanism for entitlement
 * application (RAZORPAY_PLAN.md §3/§7/§8). The `paymentId` UNIQUE constraint is
 * what makes "apply this payment's entitlement exactly once" race-proof under
 * concurrent client-callback + webhook-backstop calls: both paths do
 * `INSERT … ON CONFLICT (payment_id) DO NOTHING` and only extend the
 * entitlement when the insert actually affected a row. Never read this table
 * for access checks — that's `subscriptions.currentPeriodEnd`'s job.
 */
export const razorpayPayments = pgTable(
  "razorpay_payments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    paymentId: text("payment_id").notNull(), // the idempotency key
    orderId: text("order_id").notNull(),
    amount: integer("amount").notNull(), // paise
    passType: text("pass_type").notNull(), // 'pass_30d' | 'annual'
    earlyBird: boolean("early_bird").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    paymentIdUnq: uniqueIndex("razorpay_payments_payment_id_unq").on(t.paymentId),
  }),
);

export type RazorpayPayment = typeof razorpayPayments.$inferSelect;
export type NewRazorpayPayment = typeof razorpayPayments.$inferInsert;
