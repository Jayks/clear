import { db } from "@/lib/db/client";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { eq, and } from "drizzle-orm";

export async function getMembership(tripId: string, userId: string) {
  const [m] = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)));
  return m ?? null;
}
