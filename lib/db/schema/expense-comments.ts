import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";
import { expenses } from "./expenses";
import { groupMembers } from "./group-members";

export const expenseComments = pgTable("expense_comments", {
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
  // Max 500 chars enforced by Zod in server action; DB has no length limit by design
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type ExpenseComment = typeof expenseComments.$inferSelect;
export type NewExpenseComment = typeof expenseComments.$inferInsert;

export const MAX_COMMENT_LENGTH = 500;
