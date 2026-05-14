import { cache } from "react";
import { db } from "@/lib/db/client";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  // getUser() validates the JWT against Supabase Auth. React cache() deduplicates
  // across the render tree so only one network call is made per server-side render.
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
});

export async function getMembership(groupId: string, userId: string) {
  const [m] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return m ?? null;
}
