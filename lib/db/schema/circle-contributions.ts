import { pgTable, uuid, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const circleContributions = pgTable("circle_contributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull(),
  memberId: uuid("member_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  period: text("period"),       // "2026-06" for recurring; null for goal mode
  recordedBy:  uuid("recorded_by"),    // user_id who logged it
  isConfirmed: boolean("is_confirmed").notNull().default(true), // false = member self-report awaiting admin confirmation
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type CircleContribution = typeof circleContributions.$inferSelect;
export type NewCircleContribution = typeof circleContributions.$inferInsert;
