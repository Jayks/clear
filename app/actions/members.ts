"use server";

import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { addGuestSchema } from "@/lib/validations/trip";
import { eq, and, isNull, sum, desc, count } from "drizzle-orm";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { canAddMember, getGroupPlan } from "@/lib/subscription/gates";

export async function addGuestMember(input: { groupId: string; guestName: string }) {
  const user = await getCurrentUser();
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
    if (!(await canAddMember(groupId)))
      return { ok: false, error: "Free plan allows up to 8 members per group. Upgrade to Clear Plus for unlimited members." } as const;

    const [member] = await db.insert(groupMembers).values({
      groupId,
      guestName,
      role: "member",
    }).returning();

    revalidateTag(`group-${groupId}`, "max");
    revalidatePath(`/groups/${groupId}/members`);
    return { ok: true, member } as const;
  } catch {
    return { ok: false, error: "Failed to add guest" } as const;
  }
}

export async function importMembersFromGroup(targetGroupId: string, memberNames: string[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(targetGroupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  const names = [...new Set(memberNames.map((n) => n.trim()).filter(Boolean))];
  if (names.length === 0) return { ok: false, error: "No members selected" } as const;

  // Exclude names that are already in the group
  const existing = await db
    .select({ guestName: groupMembers.guestName })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, targetGroupId));
  const existingNames = new Set(existing.map((m) => m.guestName?.toLowerCase()).filter(Boolean));
  const toAdd = names.filter((n) => !existingNames.has(n.toLowerCase()));

  if (toAdd.length === 0)
    return { ok: false, error: "All selected members are already in this group" } as const;

  // Check member limit — canAddMember checks current count < 8 (free plan)
  const [row] = await db
    .select({ total: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, targetGroupId));
  const current = Number(row?.total ?? 0);
  const plan = await getGroupPlan(targetGroupId);
  if (plan !== "plus" && current + toAdd.length > 8) {
    const canAdd = 8 - current;
    if (canAdd <= 0)
      return { ok: false, error: "Member limit reached. Upgrade to Clear Plus for unlimited members." } as const;
    return {
      ok: false,
      error: `Can only add ${canAdd} more member${canAdd === 1 ? "" : "s"} on the free plan. Upgrade to Clear Plus for unlimited members.`,
    } as const;
  }

  try {
    await db.insert(groupMembers).values(
      toAdd.map((name) => ({
        groupId: targetGroupId,
        guestName: name,
        role: "member" as const,
      })),
    );
    revalidateTag(`group-${targetGroupId}`, "max");
    revalidatePath(`/groups/${targetGroupId}/members`);
    return { ok: true, added: toAdd.length } as const;
  } catch {
    return { ok: false, error: "Failed to import members" } as const;
  }
}

export async function removeMember(groupId: string, memberId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Not authorized" } as const;

  try {
    await db.delete(groupMembers).where(
      and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId))
    );
    revalidateTag(`group-${groupId}`, "max");
    revalidatePath(`/groups/${groupId}/members`);
    return { ok: true } as const;
  } catch (e: unknown) {
    // E-5 fix: Postgres raises a FK violation when the member has recorded
    // expenses or settlements.  Surface a clear reason instead of a generic
    // error so the admin knows what to do next.
    const msg = String(e).toLowerCase();
    const isFkViolation = msg.includes("foreign key") || msg.includes("violates");
    return {
      ok: false,
      error: isFkViolation
        ? "Cannot remove this member — they have expenses or settlements recorded. Reassign or delete those first."
        : "Failed to remove member",
    } as const;
  }
}

export async function claimGuestMember(token: string, guestMemberId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [group] = await db.select({ id: groups.id }).from(groups).where(eq(groups.shareToken, token));
  if (!group) return { ok: false, error: "Invalid invite link" } as const;

  try {
    await db.transaction(async (tx) => {
      const [guest] = await tx
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(and(eq(groupMembers.id, guestMemberId), eq(groupMembers.groupId, group.id), isNull(groupMembers.userId)));
      if (!guest) throw new Error("Guest slot not found or already claimed");

      const [existing] = await tx
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)));
      if (existing) throw new Error("You're already a member of this group");

      await tx
        .update(groupMembers)
        .set({ userId: user.id, guestName: null, displayName: extractDisplayName(user) })
        .where(eq(groupMembers.id, guestMemberId));
    });

    revalidateTag(`group-${group.id}`, "max");
    revalidatePath("/groups");
    revalidatePath(`/groups/${group.id}`, "layout");
    return { ok: true, groupId: group.id } as const;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to claim";
    return { ok: false, error: msg } as const;
  }
}

export async function joinGroup(token: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [group] = await db.select().from(groups).where(eq(groups.shareToken, token));
  if (!group) return { ok: false, error: "Invalid invite link" } as const;

  const [existing] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)));

  if (existing) return { ok: true, groupId: group.id } as const;

  try {
    if (!(await canAddMember(group.id)))
      return { ok: false, error: "This group has reached the free plan member limit. The group organiser needs to upgrade to Clear Plus to add more members." } as const;

    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: user.id,
      displayName: extractDisplayName(user),
      role: "member",
    });

    revalidateTag(`group-${group.id}`, "max");
    revalidatePath("/groups");
    revalidatePath(`/groups/${group.id}`, "layout");
    return { ok: true, groupId: group.id } as const;
  } catch {
    return { ok: false, error: "Failed to join group" } as const;
  }
}

// ── fetchMemberStatsAction — lazy stats loaded when a member profile sheet opens ─

export type MemberStats = {
  totalPaid: number;
  totalOwed: number;
  recentExpenses: {
    id: string;
    description: string;
    amount: string;
    currency: string;
    expenseDate: string;
    category: string;
  }[];
};

export async function fetchMemberStatsAction(
  memberId: string,
  groupId: string
): Promise<MemberStats | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Verify the caller is a member of the group
  const callerMembership = await getMembership(groupId, user.id);
  if (!callerMembership) return null;

  const [totalPaidRow, totalOwedRow, recentExpenses] = await Promise.all([
    // Sum of all expenses this member paid
    db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(
        and(
          eq(expenses.groupId, groupId),
          eq(expenses.paidByMemberId, memberId),
          eq(expenses.isTemplate, false)
        )
      ),

    // Sum of this member's share across all splits
    db
      .select({ total: sum(expenseSplits.shareAmount) })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(
        and(
          eq(expenseSplits.memberId, memberId),
          eq(expenses.groupId, groupId),
          eq(expenses.isTemplate, false)
        )
      ),

    // Last 3 expenses this member paid
    db
      .select({
        id:          expenses.id,
        description: expenses.description,
        amount:      expenses.amount,
        currency:    expenses.currency,
        expenseDate: expenses.expenseDate,
        category:    expenses.category,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.groupId, groupId),
          eq(expenses.paidByMemberId, memberId),
          eq(expenses.isTemplate, false)
        )
      )
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      .limit(3),
  ]);

  return {
    totalPaid: Number(totalPaidRow[0]?.total ?? 0),
    totalOwed: Number(totalOwedRow[0]?.total ?? 0),
    recentExpenses: recentExpenses.map((e) => ({
      id:          e.id,
      description: e.description,
      amount:      String(e.amount),
      currency:    e.currency,
      expenseDate: e.expenseDate,
      category:    e.category,
    })),
  };
}

// ── updateDisplayName — sets display_name across all the user's group_members rows ─

export async function updateDisplayName(name: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Display name cannot be empty" } as const;
  if (trimmed.length > 50) return { ok: false, error: "Name too long (max 50 characters)" } as const;

  // M-2 fix: also fetch the user's group IDs so we can call revalidateTag for
  // each one.  revalidatePath('/groups', 'layout') only invalidates the Next.js
  // route cache; it does NOT invalidate unstable_cache entries tagged
  // `group-${id}`.  Without the per-group revalidateTag, getGroupWithMembers
  // returns the old display name from the unstable_cache until a different
  // mutation (addExpense, settle, etc.) happens to touch that group's tag.
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id));

  await db
    .update(groupMembers)
    .set({ displayName: trimmed })
    .where(eq(groupMembers.userId, user.id));

  // Invalidate per-group unstable_cache and the route cache
  for (const { groupId } of memberRows) {
    revalidateTag(`group-${groupId}`, "max");
  }
  revalidatePath("/groups", "layout");
  return { ok: true } as const;
}
