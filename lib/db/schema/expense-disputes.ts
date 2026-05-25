import { pgTable, uuid, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";
import { expenses } from "./expenses";
import { groupMembers } from "./group-members";

export const expenseDisputes = pgTable("expense_disputes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: uuid("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  requesterMemberId: uuid("requester_member_id")
    .notNull()
    .references(() => groupMembers.id, { onDelete: "cascade" }),
  // 'question' has no Accept/Decline — resolved by a reply
  // 'remove_me' | 'change_share' | 'split_equal' → payer can Accept (auto-updates split)
  // 'other' → discussion only, resolved manually
  disputeType: text("dispute_type").notNull(),
  // Populated only for 'change_share'
  suggestedAmount: numeric("suggested_amount", { precision: 12, scale: 2 }),
  // Populated for 'question' | 'other'; optional context for others
  message: text("message"),
  // 'pending' → 'accepted' | 'declined' | 'cancelled' | 'resolved'
  // 'accepted' triggers automatic split recomputation
  // 'resolved' used for questions/other when no split change needed
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type ExpenseDispute = typeof expenseDisputes.$inferSelect;
export type NewExpenseDispute = typeof expenseDisputes.$inferInsert;

export const DISPUTE_TYPE_META = {
  question:     { label: "Ask a question",            actionable: false, icon: "❓" },
  remove_me:    { label: "Remove me from this split",  actionable: true,  icon: "🚫" },
  change_share: { label: "Change my share amount",     actionable: true,  icon: "✏️" },
  split_equal:  { label: "Split equally among all",    actionable: true,  icon: "⚖️" },
  other:        { label: "Something else",             actionable: false, icon: "💬" },
} as const;

export type DisputeType   = keyof typeof DISPUTE_TYPE_META;
export type DisputeStatus = "pending" | "accepted" | "declined" | "cancelled" | "resolved";

/** Dispute types that can be auto-resolved with one-tap Accept */
export const ACTIONABLE_DISPUTE_TYPES: DisputeType[] = [
  "remove_me",
  "change_share",
  "split_equal",
];
