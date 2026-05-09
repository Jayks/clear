import { db } from "@/lib/db/client";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and } from "drizzle-orm";

export async function getMembership(groupId: string, userId: string) {
  const [m] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return m ?? null;
}
