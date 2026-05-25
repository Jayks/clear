import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";
import { expenses } from "./expenses";
import { groupMembers } from "./group-members";

export const expenseReactions = pgTable(
  "expense_reactions",
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
    // Semantic key stored, not emoji character — UI maps to display
    emoji: text("emoji").notNull(), // 'thumbs_up' | 'seen' | 'question' | 'dispute'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // One reaction per member per expense (toggle behaviour)
    unique("unique_expense_member_reaction").on(table.expenseId, table.memberId),
  ]
);

export type ExpenseReaction = typeof expenseReactions.$inferSelect;
export type NewExpenseReaction = typeof expenseReactions.$inferInsert;

/** UI metadata for each reaction type. `notify: true` → push to expense payer. */
export const REACTION_META = {
  thumbs_up: { emoji: "👍", label: "Fine",     notify: false, color: "text-emerald-500" },
  seen:       { emoji: "✓",  label: "Seen",     notify: false, color: "text-slate-500"   },
  question:   { emoji: "❓", label: "Question", notify: true,  color: "text-amber-500"   },
  dispute:    { emoji: "⚠️", label: "Dispute",  notify: true,  color: "text-red-500"     },
} as const;

export type ReactionEmoji = keyof typeof REACTION_META;
export const REACTION_KEYS = Object.keys(REACTION_META) as ReactionEmoji[];
