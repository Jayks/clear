import { pgTable, uuid, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { streamRecords } from "./stream-records";

/**
 * Partial or full settlement payments on a stream_record.
 * Multiple rows can exist per stream (partial payments over time).
 * When SUM(stream_settlements.amount) >= stream_records.amount,
 * the stream action marks stream_records.status = 'settled'.
 */
export const streamSettlements = pgTable("stream_settlements", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId:   uuid("stream_id").notNull()
                .references(() => streamRecords.id, { onDelete: "cascade" }),
  amount:     numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency:   text("currency").notNull().default("INR"),
  note:       text("note"),
  recordedBy: uuid("recorded_by").notNull(),  // auth.users.id — who recorded the payment
  settledAt:  timestamp("settled_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type StreamSettlement    = typeof streamSettlements.$inferSelect;
export type NewStreamSettlement = typeof streamSettlements.$inferInsert;
