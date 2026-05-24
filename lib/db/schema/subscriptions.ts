import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),           // 'free' | 'plus'
  status: text("status").notNull().default("trialing"),   // 'trialing' | 'active' | 'cancelled'
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  billingCycle: text("billing_cycle"),                       // 'monthly' | 'annual' | null
  adminOverride: boolean("admin_override").notNull().default(false),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type Subscription = typeof subscriptions.$inferSelect;
