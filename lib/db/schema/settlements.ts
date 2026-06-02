import { pgTable, uuid, text, timestamp, numeric, boolean, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { groups } from "./groups";
import { groupMembers } from "./group-members";

export const settlements = pgTable(
  "settlements",
  {
    id:            uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    groupId:       uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    fromMemberId:  uuid("from_member_id").notNull().references(() => groupMembers.id),
    toMemberId:    uuid("to_member_id").notNull().references(() => groupMembers.id),
    amount:        numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency:      text("currency").notNull(),
    note:          text("note"),
    settledAt:     timestamp("settled_at", { withTimezone: true }).notNull().default(sql`now()`),
    // Phase 1 — UPI payment tracking
    isConfirmed:   boolean("is_confirmed").notNull().default(true),
    paymentMethod: text("payment_method"),   // 'upi' | 'cash' | 'bank_transfer' | 'other'
    utrReference:  text("utr_reference"),
  },
  (table) => [
    check("different_members", sql`from_member_id <> to_member_id`),
  ]
);

export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
