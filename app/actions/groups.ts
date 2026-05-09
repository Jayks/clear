"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validations/trip";
import { eq, sql } from "drizzle-orm";
import { getMembership } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createGroup(input: CreateGroupInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;

  const { name, description, coverPhotoUrl, defaultCurrency, groupType, startDate, endDate, budget, itinerary } = parsed.data;

  try {
    const [group] = await db.insert(groups).values({
      name,
      description: description || null,
      coverPhotoUrl: coverPhotoUrl || null,
      defaultCurrency,
      groupType,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budget != null ? String(budget) : null,
      itinerary: itinerary || null,
      createdBy: user.id,
    }).returning();

    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: user.id,
      displayName: extractDisplayName(user),
      role: "admin",
    });

    revalidatePath("/groups");
    return { ok: true, groupId: group.id } as const;
  } catch {
    return { ok: false, error: "Failed to create group" } as const;
  }
}

export async function updateGroup(groupId: string, input: CreateGroupInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  const { name, description, coverPhotoUrl, defaultCurrency, startDate, endDate, budget, itinerary } = parsed.data;

  try {
    await db.update(groups).set({
      name,
      description: description || null,
      coverPhotoUrl: coverPhotoUrl || null,
      defaultCurrency,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budget != null ? String(budget) : null,
      itinerary: itinerary || null,
    }).where(eq(groups.id, groupId));

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidatePath("/groups");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update group" } as const;
  }
}

export async function archiveGroup(groupId: string, archive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.update(groups).set({ isArchived: archive }).where(eq(groups.id, groupId));
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update group" } as const;
  }
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(groups).where(eq(groups.id, groupId));
    revalidatePath("/groups");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete group" } as const;
  }
}

export async function regenerateShareToken(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    const [updated] = await db
      .update(groups)
      .set({ shareToken: sql`gen_random_uuid()` })
      .where(eq(groups.id, groupId))
      .returning();

    revalidatePath(`/groups/${groupId}/members`);
    return { ok: true, shareToken: updated.shareToken } as const;
  } catch {
    return { ok: false, error: "Failed to regenerate token" } as const;
  }
}
