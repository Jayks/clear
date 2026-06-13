import { pgTable, uuid, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Per-user monthly counter for free-tier logging-AI (receipt scan / NL quick-add
 * / chat import). Backs a SILENT abuse ceiling only — never shown in the UI.
 * Approximate counting is fine: it's a circuit breaker, not a billing meter.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    period: text("period").notNull(), // 'YYYY-MM'
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    userPeriodUnq: uniqueIndex("ai_usage_user_period_unq").on(t.userId, t.period),
  }),
);

export type AiUsage = typeof aiUsage.$inferSelect;
