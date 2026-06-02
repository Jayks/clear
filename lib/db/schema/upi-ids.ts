import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userUpiIds = pgTable("user_upi_ids", {
  id:        uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId:    text("user_id").notNull(),
  upiId:     text("upi_id").notNull(),
  label:     text("label"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type UserUpiId    = typeof userUpiIds.$inferSelect;
export type NewUserUpiId = typeof userUpiIds.$inferInsert;
