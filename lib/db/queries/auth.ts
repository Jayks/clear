import { cache } from "react";
import { db } from "@/lib/db/client";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  // getSession() reads the JWT from cookie locally — no network round trip.
  // Safe: proxy.ts middleware calls getUser() on every request first, keeping the session fresh.
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
});

export async function getMembership(groupId: string, userId: string) {
  const [m] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return m ?? null;
}
