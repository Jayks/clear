"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { addGuestSchema } from "@/lib/validations/trip";
import { eq, and } from "drizzle-orm";
import { getMembership } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function addGuestMember(input: { groupId: string; guestName: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addGuestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const { groupId, guestName } = parsed.data;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  const [duplicate] = await db.select({ id: groupMembers.id }).from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.guestName, guestName)));
  if (duplicate) return { ok: false, error: "A guest with this name already exists" } as const;

  try {
    const [member] = await db.insert(groupMembers).values({
      groupId,
      guestName,
      role: "member",
    }).returning();

    revalidatePath(`/groups/${groupId}/members`);
    return { ok: true, member } as const;
  } catch {
    return { ok: false, error: "Failed to add guest" } as const;
  }
}

export async function removeMember(groupId: string, memberId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(groupMembers).where(
      and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId))
    );
    revalidatePath(`/groups/${groupId}/members`);
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to remove member" } as const;
  }
}

export async function joinGroup(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [group] = await db.select().from(groups).where(eq(groups.shareToken, token));
  if (!group) return { ok: false, error: "Invalid invite link" } as const;

  const [existing] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)));

  if (existing) return { ok: true, groupId: group.id } as const;

  try {
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: user.id,
      displayName: extractDisplayName(user),
      role: "member",
    });

    revalidatePath("/groups");
    revalidatePath(`/groups/${group.id}`, "layout");
    return { ok: true, groupId: group.id } as const;
  } catch {
    return { ok: false, error: "Failed to join group" } as const;
  }
}
