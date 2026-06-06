import { pgTable, uuid, text, timestamp, date, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";
import { groupMembers } from "./group-members";

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  paidByMemberId: uuid("paid_by_member_id").notNull().references(() => groupMembers.id),
  description: text("description").notNull(),
  category: text("category").notNull(),
  customCategory: text("custom_category"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  expenseDate: date("expense_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  isTemplate: boolean("is_template").notNull().default(false),
  isAdvance: boolean("is_advance").notNull().default(false),
  recurrence: text("recurrence"),
  sourceTemplateId: uuid("source_template_id"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  updatedByUserId: uuid("updated_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  // Receipt scanning & map view columns
  location:         jsonb("location"),
  receiptUrl:       text("receipt_url"),
  receiptItems:     jsonb("receipt_items"),
  receiptScannedAt: timestamp("receipt_scanned_at", { withTimezone: true }),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

// ── Receipt / location runtime types ─────────────────────────────────────────
// jsonb columns return `unknown` from Drizzle — always use these type guards.

export interface ExpenseLocation {
  lat:      number;
  lng:      number;
  name:     string;
  address?: string;
}

export interface ReceiptItem {
  description: string;
  amount:      number;
  quantity?:   number;
}

/** Safe cast for the `location` jsonb column. Returns null for any invalid shape. */
export function parseExpenseLocation(raw: unknown): ExpenseLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const loc = raw as Record<string, unknown>;
  if (
    typeof loc.lat  !== "number" ||
    typeof loc.lng  !== "number" ||
    typeof loc.name !== "string"
  ) return null;
  return raw as ExpenseLocation;
}

/** Safe cast for the `receipt_items` jsonb column. Filters out any malformed entries. */
export function parseReceiptItems(raw: unknown): ReceiptItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ReceiptItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as ReceiptItem).description === "string" &&
      typeof (item as ReceiptItem).amount      === "number",
  );
}
