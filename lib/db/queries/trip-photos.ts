import { db } from "@/lib/db/client";
import { tripPhotos } from "@/lib/db/schema/trip-photos";
import type { TripPhoto } from "@/lib/db/schema/trip-photos";
import { eq, count, asc } from "drizzle-orm";

/**
 * Returns all photos for a trip ordered by display_order ASC, created_at ASC (oldest first).
 */
export async function getTripPhotos(groupId: string): Promise<TripPhoto[]> {
  return db
    .select()
    .from(tripPhotos)
    .where(eq(tripPhotos.groupId, groupId))
    .orderBy(asc(tripPhotos.displayOrder), asc(tripPhotos.createdAt));
}

/**
 * Returns the total photo count for a trip (used to enforce the 30-photo cap).
 */
export async function getTripPhotoCount(groupId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(tripPhotos)
    .where(eq(tripPhotos.groupId, groupId));
  return Number(row?.total ?? 0);
}
