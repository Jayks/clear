"use server";

import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { addGuestSchema } from "@/lib/validations/trip";
import { eq, and, isNull, sum, desc } from "drizzle-orm";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { canAddMember } from "@/lib/subscription/gates";

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
  } catch {
    return { ok: false, error: "Failed to remove member" } as const;
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
