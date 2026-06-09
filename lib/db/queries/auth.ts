import { cache } from "react";
import { db } from "@/lib/db/client";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  // getUser() validates the JWT against Supabase Auth. React cache() deduplicates
  // across the render tree so only one network call is made per server-side render.
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
});

export const getMembership = cache(async (groupId: string, userId: string) => {
  const [m] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return m ?? null;
});

/** Returns a map of groupId → { id: memberId, role } for the current user across multiple groups. */
export async function getUserMemberIds(
  groupIds: string[],
  userId: string,
): Promise<Record<string, { id: string; role: string }>> {
  if (groupIds.length === 0) return {};
  const rows = await db
    .select({ groupId: groupMembers.groupId, id: groupMembers.id, role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.userId, userId), inArray(groupMembers.groupId, groupIds)));
  return Object.fromEntries(rows.map((r) => [r.groupId, { id: r.id, role: r.role }]));
}
