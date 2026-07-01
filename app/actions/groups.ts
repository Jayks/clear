"use server";

import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validations/trip";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { canCreateGroup } from "@/lib/subscription/gates";
import { getAllGroups } from "@/lib/db/queries/groups";
import { BRAND } from "@/lib/brand";

/** Lean active-group list for the in-group switcher (lazy-fetched on sheet open). */
export interface SwitcherGroup {
  id: string;
  name: string;
  groupType: string;
  circleMode: string | null;
  coverPhotoUrl: string | null;
  isDemo: boolean;
}

export async function getSwitcherGroups(): Promise<SwitcherGroup[]> {
  const { active } = await getAllGroups(); // handles auth; active = non-archived
  return active.map(({ group }) => ({
    id: group.id,
    name: group.name,
    groupType: group.groupType,
    circleMode: group.circleMode ?? null,
    coverPhotoUrl: group.coverPhotoUrl ?? null,
    isDemo: group.isDemo ?? false,
  }));
}

export async function createGroup(input: CreateGroupInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;

  const { name, description, coverPhotoUrl, photoAlbumUrl, defaultCurrency, groupType, startDate, endDate, budget, itinerary } = parsed.data;

  try {
    if (!(await canCreateGroup(user.id)))
      return { ok: false, error: `Free plan allows up to 5 active groups. Upgrade to ${BRAND.plus} for unlimited groups.` } as const;

    // B-3 fix: wrap both inserts in a transaction so a failed groupMembers insert
    // can't leave behind a group with no admin that is inaccessible and occupies a plan slot.
    const group = await db.transaction(async (tx) => {
      const [g] = await tx.insert(groups).values({
        name,
        description: description || null,
        coverPhotoUrl: coverPhotoUrl || null,
        photoAlbumUrl: photoAlbumUrl || null,
        defaultCurrency,
        groupType,
        startDate: startDate || null,
        endDate: endDate || null,
        budget: budget != null ? String(budget) : null,
        itinerary: itinerary || null,
        createdBy: user.id,
      }).returning();

      await tx.insert(groupMembers).values({
        groupId: g.id,
        userId: user.id,
        displayName: extractDisplayName(user),
        role: "admin",
      });

      return g;
    });

    revalidatePath("/groups");
    return { ok: true, groupId: group.id } as const;
  } catch {
    return { ok: false, error: "Failed to create group" } as const;
  }
}

export async function updateGroup(groupId: string, input: CreateGroupInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  const { name, description, coverPhotoUrl, photoAlbumUrl, defaultCurrency, startDate, endDate, budget, itinerary } = parsed.data;

  try {
    await db.update(groups).set({
      name,
      description: description || null,
      coverPhotoUrl: coverPhotoUrl || null,
      photoAlbumUrl: photoAlbumUrl || null,
      defaultCurrency,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budget != null ? String(budget) : null,
      itinerary: itinerary || null,
    }).where(eq(groups.id, groupId));

    revalidateTag(`group-${groupId}`, "max");
    revalidatePath(`/groups/${groupId}`, "layout");
    revalidatePath("/groups");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update group" } as const;
  }
}

// Deliberately NOT gated by isGroupLocked — this IS one of the two stated unlock
// paths (RAZORPAY_PLAN.md §9: "buy a pass, or archive/delete down to 5"). Gating
// it would trap a user who's over cap with no way to dig out without paying.
export async function archiveGroup(groupId: string, archive: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.update(groups).set({ isArchived: archive }).where(eq(groups.id, groupId));
    revalidateTag(`group-${groupId}`, "max");
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update group" } as const;
  }
}

// Deliberately NOT gated by isGroupLocked — same unlock-path reasoning as archiveGroup.
export async function deleteGroup(groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(groups).where(eq(groups.id, groupId));
    revalidateTag(`group-${groupId}`, "max");
    revalidatePath("/groups");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to delete group" } as const;
  }
}

/**
 * Updates only the photo album URL for a trip — a narrow alternative to the
 * full updateGroup action that requires all required fields to be provided.
 * Any authenticated group member may call this (not admin-only, same as album
 * links being visible to all members on the overview page).
 * Admin-only: only admins can update the link (consistent with other group metadata edits).
 */
export async function updatePhotoAlbumUrl(groupId: string, url: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  const trimmed = url.trim();
  const photoAlbumUrl = trimmed === "" ? null : trimmed;

  // Validate URL when non-empty
  if (photoAlbumUrl) {
    try { new URL(photoAlbumUrl); } catch {
      return { ok: false, error: "Invalid URL" } as const;
    }
  }

  try {
    await db.update(groups).set({ photoAlbumUrl }).where(eq(groups.id, groupId));
    revalidateTag(`group-${groupId}`, "max");
    revalidatePath(`/groups/${groupId}`, "layout");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update photo album link" } as const;
  }
}

export async function regenerateShareToken(groupId: string) {
  const user = await getCurrentUser();
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

    revalidateTag(`group-${groupId}`, "max");
    revalidatePath(`/groups/${groupId}/members`);
    return { ok: true, shareToken: updated.shareToken } as const;
  } catch {
    return { ok: false, error: "Failed to regenerate token" } as const;
  }
}
