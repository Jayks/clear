// Convention match: status / context_type are plain `text` + app-level validation
// (same as `category`, circle `status`). Do NOT declare a pgEnum — the codebase
// doesn't use DB enums for these and an unused pgEnum is dead code.
//
// UUID columns: all FK and user-id columns use uuid() to match the rest of the
// schema (group_members.ts, settlements.ts, circle-contributions.ts all use uuid
// for ids/fks).
import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const paymentRequests = pgTable("payment_requests", {
  id:               uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  token:            uuid("token").notNull().unique().default(sql`gen_random_uuid()`),

  contextType:      text("context_type").notNull(),
  groupId:          uuid("group_id").notNull(),
  groupName:        text("group_name").notNull(),

  // Nullable — Flexi one-time circles have no fixed per-person amount (see §3).
  amount:           numeric("amount", { precision: 12, scale: 2 }),
  currency:         text("currency").notNull().default("INR"),
  description:      text("description"),

  payerName:        text("payer_name").notNull(),
  payerMemberId:    uuid("payer_member_id"),

  payeeUserId:      uuid("payee_user_id").notNull(),
  // creditor's group_members.id — required for recordSettlement(toMemberId) on confirm
  payeeMemberId:    uuid("payee_member_id"),
  payeeName:        text("payee_name").notNull(),
  payeeUpiId:       text("payee_upi_id"),

  // "2026-06" for recurring circles; null for one-time circles and trip/nest
  circlePeriod:     text("circle_period"),

  // 'confirming' is transient — held by confirmExternalPayment while it writes the
  // financial row. On success → 'confirmed'. On failure → rolls back to 'self_reported'.
  status:           text("status").notNull().default("pending"),
  paymentMethod:    text("payment_method"),
  utrReference:     text("utr_reference"),

  // Back-references filled in when admin confirms
  settlementId:     uuid("settlement_id"),
  // Soft ref to circle_contributions.id — no FK (row may not exist yet at schema time)
  contributionId:   uuid("contribution_id"),

  createdByUserId:  uuid("created_by_user_id").notNull(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  // generatePaymentRequest always sets this explicitly; SQL default is a backstop only
  expiresAt:        timestamp("expires_at", { withTimezone: true }).notNull(),
  selfReportedAt:   timestamp("self_reported_at", { withTimezone: true }),
  confirmedAt:      timestamp("confirmed_at", { withTimezone: true }),
});

export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type NewPaymentRequest = typeof paymentRequests.$inferInsert;
