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
import { eq, and, inArray, sql } from "drizzle-orm";

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
    upiId, walletExpensesEnabled, members,
  } = parsed.data;

  try {
    if (!(await canCreateGroup(user.id)))
      return { ok: false, error: "Free plan allows up to 4 active groups. Upgrade to Clear Plus for unlimited groups." } as const;

    // B-4 fix: wrap all three inserts in a single transaction so a partial failure
    // (e.g. admin member insert or ghost member insert fails) cannot leave behind a
    // circle that is inaccessible and permanently occupies a free-plan group slot.
    const group = await db.transaction(async (tx) => {
      // Create the circle group
      const [g] = await tx.insert(groups).values({
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
        contributionPrivacy: circleMode === "one_time" ? (contributionPrivacy ?? "public") : null,
        walletExpensesEnabled: walletExpensesEnabled ?? true,
        createdBy: user.id,
      }).returning();

      // Add creator as admin member
      await tx.insert(groupMembers).values({
        groupId: g.id,
        userId: user.id,
        displayName: extractDisplayName(user),
        role: "admin",
      });

      // Add ghost members (name only — phone not persisted)
      if (members.length > 0) {
        await tx.insert(groupMembers).values(
          members.map((m: { name: string; phone?: string }) => ({
            groupId: g.id,
            guestName: m.name,
            role: "member" as const,
          }))
        );
      }

      return g;
    });

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

  // Server-side amount validation — client guards exist but the server is the
  // trust boundary (Bug C-1a fix).
  if (!input.amount || input.amount <= 0 || !isFinite(input.amount)) {
    return { ok: false, error: "Amount must be a positive number" } as const;
  }

  // Verify the memberId actually belongs to this circle (Bug C-1b fix — prevents
  // cross-circle contribution recording by a multi-circle admin).
  const [targetMember] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.id, input.memberId),
        eq(groupMembers.groupId, input.groupId),
      )
    )
    .limit(1);
  if (!targetMember) {
    return { ok: false, error: "Member not found in this circle" } as const;
  }

  // Dedup guard for recurring mode: prevent double-recording a confirmed
  // contribution for the same member × period (Bug C-1c fix).
  if (input.period) {
    const [existing] = await db
      .select({ id: circleContributions.id })
      .from(circleContributions)
      .where(
        and(
          eq(circleContributions.groupId, input.groupId),
          eq(circleContributions.memberId, input.memberId),
          eq(circleContributions.isConfirmed, true),
          eq(circleContributions.period, input.period),
        )
      )
      .limit(1);
    if (existing) {
      return { ok: false, error: "A confirmed contribution already exists for this member and period" } as const;
    }
  }

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
    revalidatePath(`/groups/${input.groupId}`, "layout");
    revalidateTag(`balances-${input.groupId}`, "max");   // Bug C-5 fix: was missing
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to record contribution" } as const;
  }
}

// ── Self-report contribution (member) ─────────────────────────────────────────

export async function selfReportContribution(input: {
  groupId:       string;
  amount:        number;
  period:        string | null;
  currency:      string;
  paymentMethod?: string | null;
  utrReference?:  string | null;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(input.groupId, user.id);
  if (!membership)
    return { ok: false, error: "Not a member of this circle" } as const;

  try {
    // Check if member already has an unconfirmed self-report for this period
    // to prevent duplicates
    const existing = await db
      .select({ id: circleContributions.id })
      .from(circleContributions)
      .where(
        and(
          eq(circleContributions.groupId, input.groupId),
          eq(circleContributions.memberId, membership.id),
          eq(circleContributions.isConfirmed, false),
          ...(input.period ? [eq(circleContributions.period, input.period)] : []),
        )
      );
    if (existing.length > 0) return { ok: true } as const; // already pending

    // Admins are trusted — their own self-reports are auto-confirmed.
    // Non-admin self-reports are unconfirmed until an admin reviews them.
    const isAdmin = membership.role === "admin";

    await db.insert(circleContributions).values({
      groupId:       input.groupId,
      memberId:      membership.id,
      amount:        String(input.amount),
      currency:      input.currency,
      period:        input.period,
      recordedBy:    user.id,
      isConfirmed:   isAdmin,  // admins auto-confirm; members await admin review
      note:          null,
      paymentMethod: input.paymentMethod ?? null,
      utrReference:  input.utrReference ?? null,
    });

    revalidatePath("/groups");
    // B-6 fix: use "layout" variant so Suspense subtrees (CircleCardServer) on the
    // group page also revalidate.  Also call revalidateTag so the pool balance
    // reflects an admin's auto-confirmed self-report immediately.
    revalidatePath(`/groups/${input.groupId}`, "layout");
    revalidateTag(`balances-${input.groupId}`, "max");

    // Push-notify admin about the pending contribution (only for non-admin reporters)
    if (!isAdmin) {
      const [[adminMember], [groupRow]] = await Promise.all([
        db
          .select({ userId: groupMembers.userId })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, input.groupId),
              eq(groupMembers.role, "admin"),
            )
          )
          .limit(1),
        db
          .select({ name: groups.name })
          .from(groups)
          .where(eq(groups.id, input.groupId)),
      ]);

      if (adminMember?.userId) {
        const reporterName = membership.displayName ?? membership.guestName ?? "A member";
        const periodLabel = input.period
          ? new Date(input.period + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
          : null;
        const { sendPushToUser } = await import("@/lib/notifications/send-push-notification");
        sendPushToUser({
          targetUserId: adminMember.userId,
          groupId:      input.groupId,
          title:        `💸 Contribution pending — ${groupRow?.name ?? "Circle"}`,
          body:         periodLabel
            ? `${reporterName} reported paying their ${periodLabel} contribution.`
            : `${reporterName} reported paying their contribution.`,
          url: `/groups/${input.groupId}`,
        }).catch(() => {});
      }
    }

    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to record contribution" } as const;
  }
}

// ── Confirm a single self-reported contribution (admin) ───────────────────────

export async function confirmContribution(contributionId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can confirm contributions" } as const;

  try {
    const [contrib] = await db
      .select({
        memberId: circleContributions.memberId,
        amount:   circleContributions.amount,
        currency: circleContributions.currency,
        period:   circleContributions.period,
      })
      .from(circleContributions)
      .where(
        and(
          eq(circleContributions.id, contributionId),
          eq(circleContributions.groupId, groupId),
          eq(circleContributions.isConfirmed, false),
        )
      );
    if (!contrib) return { ok: false, error: "Contribution not found" } as const;

    await db
      .update(circleContributions)
      .set({ isConfirmed: true })
      .where(
        and(
          eq(circleContributions.id, contributionId),
          eq(circleContributions.groupId, groupId),
        )
      );

    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`balances-${groupId}`, "max");

    // Notify member (fire-and-forget)
    const [[member], [groupRow]] = await Promise.all([
      db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.id, contrib.memberId)),
      db
        .select({ name: groups.name })
        .from(groups)
        .where(eq(groups.id, groupId)),
    ]);

    if (member?.userId) {
      const periodLabel = contrib.period
        ? new Date(contrib.period + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
        : null;
      const { sendPushToUser } = await import("@/lib/notifications/send-push-notification");
      sendPushToUser({
        targetUserId: member.userId,
        groupId,
        title:        `✓ Payment confirmed — ${groupRow?.name ?? "Circle"}`,
        body:         periodLabel
          ? `Your ${periodLabel} contribution has been confirmed.`
          : "Your contribution has been confirmed.",
        url: `/groups/${groupId}`,
      }).catch(() => {});
    }

    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to confirm contribution" } as const;
  }
}

// ── Dispute (delete) a single self-reported contribution (admin) ──────────────

export async function disputeContribution(
  contributionId: string,
  groupId: string,
  memberUserId: string | null,
  /** Human-readable reason from the 2-step inline picker in PaymentPendingBadge */
  reason?: string,
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can dispute contributions" } as const;

  try {
    const [contrib] = await db
      .select({ period: circleContributions.period, amount: circleContributions.amount })
      .from(circleContributions)
      .where(
        and(
          eq(circleContributions.id, contributionId),
          eq(circleContributions.groupId, groupId),
          eq(circleContributions.isConfirmed, false),
        )
      );
    if (!contrib) return { ok: false, error: "Contribution not found" } as const;

    // Re-assert isConfirmed = false in the DELETE so that a concurrent
    // confirmContribution call cannot delete an already-confirmed row
    // (Bug C-2 fix — closes the SELECT-then-act race condition).
    await db
      .delete(circleContributions)
      .where(
        and(
          eq(circleContributions.id, contributionId),
          eq(circleContributions.groupId, groupId),
          eq(circleContributions.isConfirmed, false),
        )
      );

    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`, "layout");

    // Notify member (fire-and-forget)
    if (memberUserId) {
      const [groupRow] = await db
        .select({ name: groups.name })
        .from(groups)
        .where(eq(groups.id, groupId));
      const periodLabel = contrib.period
        ? new Date(contrib.period + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
        : null;
      const { sendPushToUser } = await import("@/lib/notifications/send-push-notification");
      const reasonSuffix = reason ? ` Reason: "${reason}".` : "";
      sendPushToUser({
        targetUserId: memberUserId,
        groupId,
        title:        `Payment not confirmed — ${groupRow?.name ?? "Circle"}`,
        body:         periodLabel
          ? `Your ${periodLabel} payment wasn't confirmed.${reasonSuffix} Please check and try again.`
          : `Your payment wasn't confirmed.${reasonSuffix} Please check and try again.`,
        url: `/groups/${groupId}`,
      }).catch(() => {});
    }

    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to dispute contribution" } as const;
  }
}

// ── Confirm self-reported contributions (admin) ───────────────────────────────

export async function confirmContributions(input: {
  groupId:        string;
  contributionIds: string[];
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(input.groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can confirm contributions" } as const;

  if (input.contributionIds.length === 0) return { ok: true } as const;

  try {
    // C-8 fix: add isConfirmed=false to both the SELECT and UPDATE.
    //   SELECT guard: prevents already-confirmed rows from appearing in the
    //     notification list (avoids duplicate push when a single-confirm raced ahead).
    //   UPDATE guard: makes the write safe/idempotent for any already-confirmed rows
    //     that slipped through the SELECT before a concurrent confirm completed.
    const contribs = await db
      .select({
        id:       circleContributions.id,
        memberId: circleContributions.memberId,
        amount:   circleContributions.amount,
        currency: circleContributions.currency,
        period:   circleContributions.period,
      })
      .from(circleContributions)
      .where(
        and(
          eq(circleContributions.groupId, input.groupId),
          inArray(circleContributions.id, input.contributionIds),
          eq(circleContributions.isConfirmed, false),
        )
      );

    if (contribs.length === 0) return { ok: true } as const;

    // Confirm only the unconfirmed subset
    await db
      .update(circleContributions)
      .set({ isConfirmed: true })
      .where(
        and(
          eq(circleContributions.groupId, input.groupId),
          inArray(circleContributions.id, contribs.map((c) => c.id)),
          eq(circleContributions.isConfirmed, false),
        )
      );

    revalidatePath("/groups");
    revalidatePath(`/groups/${input.groupId}`, "layout");
    revalidateTag(`balances-${input.groupId}`, "max");

    // Push notification to each confirmed member (fire-and-forget)
    const { groupName } = await db
      .select({ groupName: groups.name })
      .from(groups)
      .where(eq(groups.id, input.groupId))
      .then(([r]) => ({ groupName: r?.groupName ?? "your circle" }));

    const notifyPromises = contribs.map(async (c) => {
      // Get the userId of the member whose contribution was confirmed
      const [member] = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.id, c.memberId));
      if (!member?.userId) return;

      const { sendPushToUser } = await import("@/lib/notifications/send-push-notification");
      const periodLabel = c.period
        ? new Date(c.period + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
        : null;

      return sendPushToUser({
        targetUserId: member.userId,
        groupId:      input.groupId,
        title:        `✓ Payment confirmed — ${groupName}`,
        body:         periodLabel
          ? `Your ${periodLabel} contribution has been confirmed.`
          : "Your contribution has been confirmed.",
        url: `/groups/${input.groupId}`,
      }).catch(() => {});
    });
    Promise.all(notifyPromises).catch(() => {});

    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to confirm contributions" } as const;
  }
}

// ── Reject / delete a self-reported contribution (admin) ─────────────────────

export async function rejectContribution(input: {
  groupId:        string;
  contributionId: string;
  memberUserId:   string | null;  // null for ghost members (no push)
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(input.groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can reject contributions" } as const;

  try {
    // Get contribution details before deleting
    const [contrib] = await db
      .select({ period: circleContributions.period, currency: circleContributions.currency })
      .from(circleContributions)
      .where(
        and(
          eq(circleContributions.id, input.contributionId),
          eq(circleContributions.groupId, input.groupId),
          eq(circleContributions.isConfirmed, false), // only reject unconfirmed
        )
      );
    if (!contrib) return { ok: false, error: "Contribution not found" } as const;

    // Re-assert isConfirmed = false in the DELETE (Bug C-2 fix — same race
    // condition guard as disputeContribution above).
    await db
      .delete(circleContributions)
      .where(
        and(
          eq(circleContributions.id, input.contributionId),
          eq(circleContributions.groupId, input.groupId),
          eq(circleContributions.isConfirmed, false),
        )
      );

    revalidatePath("/groups");
    revalidatePath(`/groups/${input.groupId}`, "layout");

    // Notify the member if they have a Clear account
    if (input.memberUserId) {
      const { sendPushToUser } = await import("@/lib/notifications/send-push-notification");
      const { groupName } = await db
        .select({ groupName: groups.name })
        .from(groups)
        .where(eq(groups.id, input.groupId))
        .then(([r]) => ({ groupName: r?.groupName ?? "your circle" }));

      const periodLabel = contrib.period
        ? new Date(contrib.period + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })
        : null;

      sendPushToUser({
        targetUserId: input.memberUserId,
        groupId:      input.groupId,
        title:        `Payment not confirmed — ${groupName}`,
        body:         periodLabel
          ? `Your ${periodLabel} payment wasn't confirmed. Please check your UPI app and try again.`
          : "Your payment wasn't confirmed. Please check your UPI app and try again.",
        url: `/groups/${input.groupId}`,
      }).catch(() => {});
    }

    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to reject contribution" } as const;
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

  // Guard: "From wallet" expenses cannot exceed the available pool balance.
  // "I paid from my pocket" (isAdvance=true) is always allowed — the admin
  // is personally advancing funds and will be reimbursed from future contributions
  // (Bug C-3 fix).
  if (!isAdvance) {
    const [contribRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(${circleContributions.amount}), '0')` })
      .from(circleContributions)
      .where(
        and(
          eq(circleContributions.groupId, groupId),
          eq(circleContributions.isConfirmed, true),
        )
      );
    const [expenseRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
      .from(expenses)
      .where(
        and(
          eq(expenses.groupId, groupId),
          eq(expenses.isTemplate, false),
        )
      );
    const poolBalance = Number(contribRow?.total ?? 0) - Number(expenseRow?.total ?? 0);
    if (amount > poolBalance + 0.01) {
      const available = poolBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 });
      return {
        ok: false,
        error: `Wallet balance is ₹${available}. Use "I paid from my pocket" for advance expenses.`,
      } as const;
    }
  }

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

// ── Update circle one-time lifecycle status (admin only) ─────────────────────

export async function updateCircleStatus(
  groupId: string,
  newStatus: "purchased" | "complete",
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only circle admins can update the status" } as const;

  try {
    // Fetch target amount, current status, and mode for server-side guards
    const [group] = await db
      .select({
        targetAmount:  groups.targetAmount,
        circleMode:    groups.circleMode,
        circleStatus:  groups.circleStatus,
      })
      .from(groups)
      .where(eq(groups.id, groupId));

    if (!group || group.circleMode !== "one_time")
      return { ok: false, error: "Not a one-time circle" } as const;

    // State-machine guard: only allow forward transitions (Bug C-4 fix).
    // active → purchased → complete.  No backward transitions permitted.
    const currentStatus = group.circleStatus ?? "active";
    const validNext: Record<string, string> = {
      "active":    "purchased",
      "purchased": "complete",
    };
    if (validNext[currentStatus] !== newStatus) {
      return {
        ok: false,
        error: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
      } as const;
    }

    // Gate: cannot transition to purchased/complete unless goal is fully funded
    if (group.targetAmount) {
      const target = Number(group.targetAmount);
      const [{ collected }] = await db
        .select({ collected: sql<string>`COALESCE(SUM(${circleContributions.amount}), 0)` })
        .from(circleContributions)
        .where(
          and(
            eq(circleContributions.groupId, groupId),
            eq(circleContributions.isConfirmed, true),
          )
        );

      if (Number(collected) < target) {
        const stillNeeded = target - Number(collected);
        return {
          ok: false,
          error: `Goal not yet reached — ₹${stillNeeded.toLocaleString("en-IN")} still needed`,
        } as const;
      }
    }

    await db
      .update(groups)
      .set({ circleStatus: newStatus })
      .where(and(eq(groups.id, groupId), eq(groups.circleMode, "one_time")));

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`group-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update status" } as const;
  }
}

// ── Send contribution reminder (push notification) to a single member ────────

export async function sendContributionReminder(groupId: string, memberId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can send reminders" } as const;

  try {
    const [[targetMember], [groupRow]] = await Promise.all([
      db
        .select({ userId: groupMembers.userId, displayName: groupMembers.displayName, guestName: groupMembers.guestName })
        .from(groupMembers)
        .where(and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId))),
      db
        .select({ name: groups.name, contributionAmount: groups.contributionAmount, circleMode: groups.circleMode })
        .from(groups)
        .where(eq(groups.id, groupId)),
    ]);

    if (!targetMember?.userId)
      return { ok: false, error: "Member has no account to notify" } as const;
    if (!groupRow)
      return { ok: false, error: "Circle not found" } as const;

    const fixedAmount = groupRow.contributionAmount ? Number(groupRow.contributionAmount) : null;
    const isRecurring = groupRow.circleMode === "recurring";
    const periodLabel = isRecurring
      ? new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })
      : null;

    const body = fixedAmount && periodLabel
      ? `Your ₹${fixedAmount.toLocaleString("en-IN")} contribution for ${periodLabel} is still pending.`
      : fixedAmount
      ? `Your ₹${fixedAmount.toLocaleString("en-IN")} contribution to ${groupRow.name} is still pending.`
      : `Your contribution to ${groupRow.name} is still pending.`;

    const { sendPushToUser } = await import("@/lib/notifications/send-push-notification");
    sendPushToUser({
      targetUserId: targetMember.userId,
      groupId,
      title:        `Reminder — ${groupRow.name}`,
      body,
      url:          `/groups/${groupId}`,
    }).catch(() => {});

    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to send reminder" } as const;
  }
}

// ── Toggle wallet expense tracking (admin only) ───────────────────────────────

export async function updateWalletExpensesSetting(
  groupId: string,
  enabled: boolean,
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.role !== "admin")
    return { ok: false, error: "Only admins can change this setting" } as const;

  try {
    await db
      .update(groups)
      .set({ walletExpensesEnabled: enabled })
      .where(eq(groups.id, groupId));

    revalidatePath(`/groups/${groupId}`, "layout");
    revalidateTag(`group-${groupId}`, "max");
    return { ok: true } as const;
  } catch {
    return { ok: false, error: "Failed to update setting" } as const;
  }
}
