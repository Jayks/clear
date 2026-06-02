import { cache } from "react";
import { db } from "@/lib/db/client";
import { userUpiIds } from "@/lib/db/schema/upi-ids";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { UserUpiId } from "@/lib/db/schema/upi-ids";

/** All UPI IDs for a user, default first, then by created_at. */
export const getUserUpiIds = cache(async (userId: string): Promise<UserUpiId[]> => {
  return db
    .select()
    .from(userUpiIds)
    .where(eq(userUpiIds.userId, userId))
    .orderBy(desc(userUpiIds.isDefault), desc(userUpiIds.createdAt));
});

/** The single default UPI ID for a user, or null. */
export async function getDefaultUpiId(userId: string): Promise<UserUpiId | null> {
  const [row] = await db
    .select()
    .from(userUpiIds)
    .where(and(eq(userUpiIds.userId, userId), eq(userUpiIds.isDefault, true)))
    .limit(1);
  return row ?? null;
}

/**
 * Batch fetch: given a list of userIds, returns a map of userId → default UPI ID (or null).
 * Used by settle page to show UPI pay buttons per suggestion.
 */
export async function getMemberDefaultUpiIds(
  userIds: string[]
): Promise<Record<string, UserUpiId | null>> {
  if (userIds.length === 0) return {};

  const rows = await db
    .select()
    .from(userUpiIds)
    .where(and(inArray(userUpiIds.userId, userIds), eq(userUpiIds.isDefault, true)));

  const result: Record<string, UserUpiId | null> = {};
  for (const uid of userIds) result[uid] = null;
  for (const row of rows) result[row.userId] = row;
  return result;
}
