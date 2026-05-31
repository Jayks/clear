"use server";

import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { circleContributions } from "@/lib/db/schema/circle-contributions";
import { expenses } from "@/lib/db/schema/expenses";
import { createCircleActionSchema, type CreateCircleActionInput } from "@/lib/validations/circle";
import { addCircleExpenseSchema, type AddCircleExpenseInput } from "@/lib/validations/circle-expense";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { extractDisplayName } from "@/lib/utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { canCreateGroup, canAddExpense } from "@/lib/subscription/gates";
import { eq, and } from "drizzle-orm";

// ── Create circle group ───────────────────────────────────────────────────────

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

// ── Record contribution (admin) ───────────────────────────────────────────────

export async function recordContribution(input: {
  groupId:  string;
  memberId: string;
  amount:   number;
  period:   string | null;
  currency: string;
  note?:    string;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(input.groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can record contributions" } as const;

  try {
    await db.insert(circleContributions).values({
      groupId:    input.groupId,
      memberId:   input.memberId,
      amount:     String(input.amount),
      currency:   input.currency,
      period:     input.period,
      recordedBy: user.id,
      note:       input.note ?? null,
    });

    revalidatePath("/groups");
    revalidatePath(`/groups/${input.groupId}`);
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to record contribution" } as const;
  }
}

// ── Self-report contribution (member) ─────────────────────────────────────────

export async function selfReportContribution(input: {
  groupId:  string;
  amount:   number;
  period:   string | null;
  currency: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(input.groupId, user.id);
  if (!membership)
    return { ok: false, error: "Not a member of this circle" } as const;

  try {
    await db.insert(circleContributions).values({
      groupId:    input.groupId,
      memberId:   membership.id,
      amount:     String(input.amount),
      currency:   input.currency,
      period:     input.period,
      recordedBy: user.id, // self-reported — recorded_by = own user id
      note:       null,
    });

    revalidatePath("/groups");
    revalidatePath(`/groups/${input.groupId}`);
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to record contribution" } as const;
  }
}

// ── Log circle pool expense (admin only) ──────────────────────────────────────

export async function addCircleExpense(input: AddCircleExpenseInput) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = addCircleExpenseSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" } as const;

  const { groupId, description, category, customCategory, amount, currency, expenseDate, notes, isAdvance } = parsed.data;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only circle admins can log wallet expenses" } as const;

  // Check expense limit (pool expenses count toward the group's expense limit)
  if (!(await canAddExpense(groupId)))
    return { ok: false, error: "Free plan allows up to 50 expenses per group. Upgrade to Clear Plus for unlimited expenses." } as const;

  try {
    const [expense] = await db.insert(expenses).values({
      groupId,
      paidByMemberId: membership.id, // admin is always the payer for circle pool expenses
      description,
      category,
      customCategory: customCategory ?? null,
      amount:         String(amount),
      currency,
      expenseDate,
      notes:          notes || null,
      isAdvance,
      createdByUserId: user.id,
      // No expense_splits for circles — pool absorbs the full cost
    }).returning();

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    return { ok: true, expenseId: expense.id } as const;
  } catch {
    return { ok: false, error: "Failed to log wallet expense" } as const;
  }
}

// ── Update circle goal lifecycle status (admin only) ──────────────────────────

export async function updateCircleStatus(
  groupId: string,
  newStatus: "purchased" | "complete",
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only circle admins can update the goal status" } as const;

  try {
    await db
      .update(groups)
      .set({ circleStatus: newStatus })
      .where(and(eq(groups.id, groupId), eq(groups.circleMode, "goal")));

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`group-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update goal status" } as const;
  }
}
