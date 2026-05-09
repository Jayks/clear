import { pgTable, uuid, text, timestamp, date, numeric, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { trips } from "./trips";
import { tripMembers } from "./trip-members";

export const categoryEnum = pgEnum("expense_category", [
  "food",
  "accommodation",
  "transport",
  "sightseeing",
  "shopping",
  "activities",
  "groceries",
  "other",
]);

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  paidByMemberId: uuid("paid_by_member_id").notNull().references(() => tripMembers.id),
  description: text("description").notNull(),
  category: categoryEnum("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  expenseDate: date("expense_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
