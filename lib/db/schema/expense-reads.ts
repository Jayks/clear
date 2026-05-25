import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";
import { expenses } from "./expenses";
import { groupMembers } from "./group-members";

export const expenseReads = pgTable(
  "expense_reads",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
    /** Updated every time the member opens the expense detail sheet. */
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    unique("unique_expense_member_read").on(table.expenseId, table.memberId),
  ]
);

export type ExpenseRead = typeof expenseReads.$inferSelect;
export type NewExpenseRead = typeof expenseReads.$inferInsert;
