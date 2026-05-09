import { pgTable, uuid, numeric, pgEnum, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { expenses } from "./expenses";
import { groupMembers } from "./group-members";

export const splitTypeEnum = pgEnum("split_type", [
  "equal",
  "exact",
  "percentage",
  "shares",
]);

export const expenseSplits = pgTable(
  "expense_splits",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    expenseId: uuid("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => groupMembers.id, { onDelete: "cascade" }),
    shareAmount: numeric("share_amount", { precision: 12, scale: 2 }).notNull(),
    splitType: splitTypeEnum("split_type").notNull(),
    splitValue: numeric("split_value", { precision: 12, scale: 4 }),
  },
  (table) => [unique("unique_expense_member").on(table.expenseId, table.memberId)]
);

export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type NewExpenseSplit = typeof expenseSplits.$inferInsert;
