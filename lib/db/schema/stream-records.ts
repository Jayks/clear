import { pgTable, uuid, text, timestamp, numeric, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { streamGuests } from "./stream-guests";

/**
 * A single bilateral debt moment between two people.
 *
 * direction is always from the CREATOR's perspective:
 *   'they_owe_me' — creator paid on behalf of the counterpart
 *   'i_owe_them'  — creator owes money to the counterpart
 *
 * Exactly one of (counterpart_id, counterpart_guest_id) must be non-null.
 * This is enforced by the DB CHECK constraint below and by logStreamSchema.
 *
 * status lifecycle:
 *   pending → confirmed | disputed
 *   confirmed / disputed → settled
 *   any non-forgiven → forgiven  (lender-only private action)
 *
 * confirm_token is a one-time URL token for guest (no-login) confirmation.
 * Expires 48 hours after creation — set in the logStream server action.
 */
export const streamRecords = pgTable(
  "stream_records",
  {
    id:                    uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    creatorId:             uuid("creator_id").notNull(),       // auth.users.id
    // Exactly one of the two counterpart columns must be non-null (CHECK below):
    counterpartId:         uuid("counterpart_id"),             // auth.users.id (Clear user)
    counterpartGuestId:    uuid("counterpart_guest_id")
                             .references(() => streamGuests.id, { onDelete: "cascade" }),
    amount:                numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency:              text("currency").notNull().default("INR"),
    // 'they_owe_me' | 'i_owe_them' — always from creator's perspective
    direction:             text("direction").notNull(),
    note:                  text("note"),
    // 'pending' | 'confirmed' | 'disputed' | 'settled' | 'forgiven'
    status:                text("status").notNull().default("pending"),
    // Guest (no-login) confirmation token — valid for 48 hrs after creation
    confirmToken:          uuid("confirm_token").unique().default(sql`gen_random_uuid()`),
    confirmTokenExpiresAt: timestamp("confirm_token_expires_at", { withTimezone: true }),
    confirmedAt:           timestamp("confirmed_at",  { withTimezone: true }),
    // Dispute
    disputedAt:            timestamp("disputed_at",   { withTimezone: true }),
    disputeReason:         text("dispute_reason"),  // 'wrong_amount'|'already_paid'|'dont_recognize'|'other'
    disputeNote:           text("dispute_note"),
    // Settlement
    settledAt:             timestamp("settled_at",    { withTimezone: true }),
    // Forgiveness — private, counterpart is never notified
    forgivenAt:            timestamp("forgiven_at",   { withTimezone: true }),
    forgivenNote:          text("forgiven_note"),   // private — never shown to counterpart
    createdAt:             timestamp("created_at",    { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt:             timestamp("updated_at",    { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    // Enforce that exactly one counterpart type is set
    check(
      "stream_records_counterpart_xor",
      sql`(${table.counterpartId} IS NOT NULL AND ${table.counterpartGuestId} IS NULL)
       OR (${table.counterpartId} IS NULL     AND ${table.counterpartGuestId} IS NOT NULL)`,
    ),
    // Prevent self-streams (Clear users only — guests can't be the same person)
    check(
      "stream_records_no_self",
      sql`${table.creatorId} <> COALESCE(${table.counterpartId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
  ],
);

export type StreamRecord    = typeof streamRecords.$inferSelect;
export type NewStreamRecord = typeof streamRecords.$inferInsert;

// ── Stream status/direction type aliases ──────────────────────────────────────
export type StreamStatus    = "pending" | "confirmed" | "disputed" | "settled" | "forgiven";
export type StreamDirection = "they_owe_me" | "i_owe_them";
