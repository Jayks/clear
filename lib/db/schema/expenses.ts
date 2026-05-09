import { pgTable, uuid, text, timestamp, date, numeric, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";
import { groupMembers } from "./group-members";

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  paidByMemberId: uuid("paid_by_member_id").notNull().references(() => groupMembers.id),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  expenseDate: date("expense_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  isTemplate: boolean("is_template").notNull().default(false),
  recurrence: text("recurrence"),
  sourceTemplateId: uuid("source_template_id"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
