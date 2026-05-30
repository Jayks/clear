/**
 * Cleanup script — deletes all stream records, guests, and settlements
 * created by a specific user ID. Run before re-seeding.
 * Usage: pnpm tsx --env-file=.env.local scripts/cleanup-streams.ts <userId>
 */
import "dotenv/config";
import { db } from "../lib/db/client";
import { streamGuests } from "../lib/db/schema/stream-guests";
import { streamRecords } from "../lib/db/schema/stream-records";
import { eq } from "drizzle-orm";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm tsx --env-file=.env.local scripts/cleanup-streams.ts <userId>");
  process.exit(1);
}

console.log(`🗑️  Deleting stream data for user: ${userId}`);

// stream_settlements cascade-delete when stream_records are deleted
const deletedRecords = await db.delete(streamRecords)
  .where(eq(streamRecords.creatorId, userId))
  .returning({ id: streamRecords.id });

const deletedGuests = await db.delete(streamGuests)
  .where(eq(streamGuests.createdBy, userId))
  .returning({ id: streamGuests.id });

console.log(`✅  Deleted ${deletedRecords.length} stream records (+ settlements via cascade)`);
console.log(`✅  Deleted ${deletedGuests.length} stream guests`);
process.exit(0);
