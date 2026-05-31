"use server";

import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { createCircleActionSchema, type CreateCircleActionInput } from "@/lib/validations/circle";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { canCreateGroup } from "@/lib/subscription/gates";

export async function createCircle(input: CreateCircleActionInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = createCircleActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;
  }

  const {
    circleMode, name, defaultCurrency,
    contributionAmount, contributionDay,
    targetAmount, eventDate, contributionPrivacy,
    upiId, members,
  } = parsed.data;

  try {
    if (!(await canCreateGroup(user.id)))
      return { ok: false, error: "Free plan allows up to 4 active groups. Upgrade to Clear Plus for unlimited groups." } as const;

    // Create the circle group
    const [group] = await db.insert(groups).values({
      name,
      groupType: "circle",
      defaultCurrency,
      circleMode,
      contributionAmount: contributionAmount != null ? String(contributionAmount) : null,
      contributionPeriod: circleMode === "recurring" ? "monthly" : null,
      contributionDay: circleMode === "recurring" ? (contributionDay ?? 1) : null,
      targetAmount: targetAmount != null ? String(targetAmount) : null,
      eventDate: eventDate || null,
      circleStatus: "active",
      upiId: upiId || null,
      contributionPrivacy: circleMode === "goal" ? (contributionPrivacy ?? "public") : null,
      createdBy: user.id,
    }).returning();

    // Add creator as admin member
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: user.id,
      displayName: extractDisplayName(user),
      role: "admin",
    });

    // Add ghost members (name only — phone not persisted)
    if (members.length > 0) {
      await db.insert(groupMembers).values(
        members.map((m: { name: string; phone?: string }) => ({
          groupId: group.id,
          guestName: m.name,
          role: "member" as const,
        }))
      );
    }

    revalidatePath("/groups");
    return {
      ok: true,
      groupId: group.id,
      shareToken: group.shareToken,
      creatorName: extractDisplayName(user) ?? "Someone",
    } as const;
  } catch {
    return { ok: false, error: "Failed to create circle" } as const;
  }
}
