"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq } from "drizzle-orm";
import { getMembership } from "@/lib/db/queries/auth";

export async function getGroupMembersForQuickAdd(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member" } as const;

  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(groupMembers.joinedAt);

  return { ok: true, members } as const;
}
