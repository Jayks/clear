import { pgTable, uuid, text, timestamp, smallint } from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { groupMembers } from "./group-members";

export const tripPhotos = pgTable("trip_photos", {
  id:           uuid("id").primaryKey().defaultRandom(),
  groupId:      uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  memberId:     uuid("member_id").references(() => groupMembers.id, { onDelete: "set null" }),
  storagePath:  text("storage_path").notNull(),  // in-bucket path: {groupId}/{photoId}.jpg
  publicUrl:    text("public_url").notNull(),    // full public URL (stored at upload time)
  caption:      text("caption"),
  displayOrder: smallint("display_order").default(0),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// CREATE INDEX trip_photos_group_id_idx ON trip_photos(group_id, display_order, created_at);

export type TripPhoto = typeof tripPhotos.$inferSelect;
export type NewTripPhoto = typeof tripPhotos.$inferInsert;
