"use server";

import { db } from "@/lib/db/client";
import { expenseReactions, REACTION_META, type ReactionEmoji } from "@/lib/db/schema/expense-reactions";
import { expenseComments, MAX_COMMENT_LENGTH } from "@/lib/db/schema/expense-comments";
import { expenseDisputes, ACTIONABLE_DISPUTE_TYPES, type DisputeType } from "@/lib/db/schema/expense-disputes";
import { expenseReads } from "@/lib/db/schema/expense-reads";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { groupMembers } from "@/lib/db/schema/group-members";
import { groups } from "@/lib/db/schema/groups";
import { getCurrentUser, getMembership } from "@/lib/db/queries/auth";
import { applyRemoveMe, applyChangeShare, applySplitEqual } from "@/lib/interactions/split-transforms";
import { sendPushToUser } from "@/lib/notifications/send-push-notification";
import { sendPushToMembers } from "@/lib/notifications/send-push-notification";
import { revalidateTag, revalidatePath } from "next/cache";
import { eq, and, ne, sql } from "drizzle-orm";
import { z } from "zod";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Invalidate interaction + balance caches for a group */
function revalidateGroup(groupId: string) {
  revalidateTag(`interactions-${groupId}`, "max");
  revalidateTag(`balances-${groupId}`, "max");
}

/** Fetch the expense payer's userId (null if guest member) */
async function getPayerUserId(paidByMemberId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.id, paidByMemberId));
  return row?.userId ?? null;
}

/** Fetch group name for push notification titles */
async function getGroupName(groupId: string): Promise<string> {
  const [row] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId));
  return row?.name ?? "Clear";
}

// ── Fetch actions (called from client components, like fetchExpenseSplitsAction) ─

/** Bypass unstable_cache and return fresh comments — used by the detail sheet.
 *  Returns null on auth failure; returns [] on DB error so the caller degrades gracefully. */
export async function fetchExpenseCommentsAction(expenseId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const membership = await getMembership(groupId, user.id);
  if (!membership) return null;

  try {
    const rows = await db
      .select({
        id:          expenseComments.id,
        content:     expenseComments.content,
        createdAt:   expenseComments.createdAt,
        memberId:    expenseComments.memberId,
        displayName: groupMembers.displayName,
        guestName:   groupMembers.guestName,
      })
      .from(expenseComments)
      .leftJoin(groupMembers, eq(groupMembers.id, expenseComments.memberId))
      .where(eq(expenseComments.expenseId, expenseId))
      .orderBy(expenseComments.createdAt);

    return rows.map((r) => ({
      id:         r.id,
      content:    r.content,
      createdAt:  r.createdAt,
      memberId:   r.memberId,
      memberName: r.displayName ?? r.guestName ?? "Member",
    }));
  } catch {
    // Transient DB error (e.g. pool timeout) — return empty rather than crashing
    return [];
  }
}

export async function fetchExpenseReactionsAction(expenseId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const membership = await getMembership(groupId, user.id);
  if (!membership) return null;

  const rows = await db
    .select({
      emoji:       expenseReactions.emoji,
      memberId:    expenseReactions.memberId,
      displayName: groupMembers.displayName,
      guestName:   groupMembers.guestName,
    })
    .from(expenseReactions)
    .leftJoin(groupMembers, eq(groupMembers.id, expenseReactions.memberId))
    .where(eq(expenseReactions.expenseId, expenseId))
    .orderBy(expenseReactions.createdAt);

  return rows.map((r) => ({
    emoji:      r.emoji as ReactionEmoji,
    memberId:   r.memberId,
    memberName: r.displayName ?? r.guestName ?? "Member",
  }));
}

export async function fetchExpenseDisputesAction(expenseId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const membership = await getMembership(groupId, user.id);
  if (!membership) return null;

  const rows = await db
    .select({
      id:                expenseDisputes.id,
      disputeType:       expenseDisputes.disputeType,
      status:            expenseDisputes.status,
      requesterMemberId: expenseDisputes.requesterMemberId,
      suggestedAmount:   expenseDisputes.suggestedAmount,
      message:           expenseDisputes.message,
      createdAt:         expenseDisputes.createdAt,
      resolvedAt:        expenseDisputes.resolvedAt,
      displayName:       groupMembers.displayName,
      guestName:         groupMembers.guestName,
    })
    .from(expenseDisputes)
    .leftJoin(groupMembers, eq(groupMembers.id, expenseDisputes.requesterMemberId))
    .where(eq(expenseDisputes.expenseId, expenseId))
    .orderBy(expenseDisputes.createdAt);

  return rows.map((r) => ({
    id:                r.id,
    type:              r.disputeType as DisputeType,
    status:            r.status,
    requesterMemberId: r.requesterMemberId,
    requesterName:     r.displayName ?? r.guestName ?? "Member",
    suggestedAmount:   r.suggestedAmount !== null ? Number(r.suggestedAmount) : null,
    message:           r.message,
    createdAt:         r.createdAt,
    resolvedAt:        r.resolvedAt,
  }));
}

// ── addReaction — toggle 👍 or ✓ for the current user ─────────────────────────
// ❓ and ⚠️ are set atomically inside raiseQuestion / raiseDispute.

const reactionSchema = z.object({
  expenseId: z.string().uuid(),
  groupId:   z.string().uuid(),
  emoji:     z.enum(["thumbs_up", "seen"]), // only passive reactions via this action
});

export async function addReaction(
  expenseId: string,
  groupId: string,
  emoji: "thumbs_up" | "seen"
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = reactionSchema.safeParse({ expenseId, groupId, emoji });
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" } as const;

  const [existing] = await db
    .select({ id: expenseReactions.id, emoji: expenseReactions.emoji })
    .from(expenseReactions)
    .where(
      and(
        eq(expenseReactions.expenseId, expenseId),
        eq(expenseReactions.memberId, membership.id)
      )
    );

  if (existing) {
    if (existing.emoji === emoji) {
      // Toggle off — same emoji tapped again
      await db.delete(expenseReactions).where(eq(expenseReactions.id, existing.id));
    } else {
      // Switch to new emoji
      await db.update(expenseReactions).set({ emoji }).where(eq(expenseReactions.id, existing.id));
    }
  } else {
    await db.insert(expenseReactions).values({
      expenseId,
      groupId,
      memberId: membership.id,
      emoji,
    });
  }

  revalidateTag(`interactions-${groupId}`, "max");
  return { ok: true } as const;
}

// ── markSeen — upserts a "seen" reaction; never toggles off ──────────────────
// Also stamps expense_reads.last_read_at so unread indicators clear on open.
// Called automatically when the expense detail sheet opens.

export async function markSeenAction(expenseId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return;

  await Promise.all([
    // "seen" reaction — first-time only (read receipt count)
    db
      .insert(expenseReactions)
      .values({ expenseId, groupId, memberId: membership.id, emoji: "seen" })
      .onConflictDoNothing(),

    // last_read_at — updated every open so the unread dot clears
    db
      .insert(expenseReads)
      .values({ expenseId, groupId, memberId: membership.id })
      .onConflictDoUpdate({
        target: [expenseReads.expenseId, expenseReads.memberId],
        set: { lastReadAt: sql`now()` },
      }),
  ]);

  revalidateTag(`interactions-${groupId}`, "max");
}

// ── raiseQuestion — sets ❓ reaction + creates question dispute + pushes payer ─

const questionSchema = z.object({
  expenseId: z.string().uuid(),
  groupId:   z.string().uuid(),
  message:   z.string().min(1).max(500),
});

export async function raiseQuestion(expenseId: string, groupId: string, message: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = questionSchema.safeParse({ expenseId, groupId, message: message.trim() });
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" } as const;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return { ok: false, error: "Expense not found" } as const;

  // Prevent self-questioning (payer asking a question about their own expense)
  if (expense.paidByMemberId === membership.id) {
    return { ok: false, error: "You cannot raise a question about your own expense" } as const;
  }

  // Cancel any existing pending dispute/question from this member on this expense
  await db
    .update(expenseDisputes)
    .set({ status: "cancelled", resolvedAt: new Date() })
    .where(
      and(
        eq(expenseDisputes.expenseId, expenseId),
        eq(expenseDisputes.requesterMemberId, membership.id),
        eq(expenseDisputes.status, "pending")
      )
    );

  // Upsert ❓ reaction
  const [existing] = await db
    .select({ id: expenseReactions.id })
    .from(expenseReactions)
    .where(
      and(
        eq(expenseReactions.expenseId, expenseId),
        eq(expenseReactions.memberId, membership.id)
      )
    );

  if (existing) {
    await db.update(expenseReactions).set({ emoji: "question" }).where(eq(expenseReactions.id, existing.id));
  } else {
    await db.insert(expenseReactions).values({ expenseId, groupId, memberId: membership.id, emoji: "question" });
  }

  // Create dispute record
  await db.insert(expenseDisputes).values({
    expenseId,
    groupId,
    requesterMemberId: membership.id,
    disputeType: "question",
    message: parsed.data.message,
    status: "pending",
  });

  revalidateGroup(groupId);

  // Push to expense payer
  const payerUserId = await getPayerUserId(expense.paidByMemberId);
  if (payerUserId && payerUserId !== user.id) {
    const groupName = await getGroupName(groupId);
    const actorName = membership.displayName ?? membership.guestName ?? "Someone";
    await sendPushToUser({
      targetUserId: payerUserId,
      groupId,
      title: groupName,
      body: `${actorName} has a question about "${expense.description}": ${parsed.data.message}`,
      url: `/groups/${groupId}/expenses/${expenseId}/thread`,
    });
  }

  return { ok: true } as const;
}

// ── raiseDispute — sets ⚠️ reaction + creates actionable dispute + pushes payer ─

const disputeSchema = z.discriminatedUnion("disputeType", [
  z.object({ disputeType: z.literal("remove_me") }),
  z.object({ disputeType: z.literal("change_share"), suggestedAmount: z.number().nonnegative() }),
  z.object({ disputeType: z.literal("split_equal") }),
  z.object({ disputeType: z.literal("other"), message: z.string().min(1).max(500) }),
]).and(z.object({ expenseId: z.string().uuid(), groupId: z.string().uuid() }));

export async function raiseDispute(
  expenseId: string,
  groupId: string,
  disputeType: DisputeType,
  suggestedAmount?: number,
  message?: string
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const rawInput = { expenseId, groupId, disputeType, suggestedAmount, message: message?.trim() };
  const parsed = disputeSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" } as const;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return { ok: false, error: "Expense not found" } as const;

  if (expense.paidByMemberId === membership.id) {
    return { ok: false, error: "You cannot dispute your own expense" } as const;
  }

  // Validate suggested amount is within expense total
  if (disputeType === "change_share" && suggestedAmount !== undefined) {
    if (suggestedAmount > Number(expense.amount)) {
      return { ok: false, error: "Suggested amount exceeds the expense total" } as const;
    }
  }

  // Cancel any existing pending dispute from this member on this expense
  await db
    .update(expenseDisputes)
    .set({ status: "cancelled", resolvedAt: new Date() })
    .where(
      and(
        eq(expenseDisputes.expenseId, expenseId),
        eq(expenseDisputes.requesterMemberId, membership.id),
        eq(expenseDisputes.status, "pending")
      )
    );

  // Upsert ⚠️ reaction
  const [existing] = await db
    .select({ id: expenseReactions.id })
    .from(expenseReactions)
    .where(
      and(
        eq(expenseReactions.expenseId, expenseId),
        eq(expenseReactions.memberId, membership.id)
      )
    );

  if (existing) {
    await db.update(expenseReactions).set({ emoji: "dispute" }).where(eq(expenseReactions.id, existing.id));
  } else {
    await db.insert(expenseReactions).values({ expenseId, groupId, memberId: membership.id, emoji: "dispute" });
  }

  // Create dispute record
  await db.insert(expenseDisputes).values({
    expenseId,
    groupId,
    requesterMemberId: membership.id,
    disputeType,
    suggestedAmount: suggestedAmount !== undefined ? String(suggestedAmount) : null,
    message: message?.trim() ?? null,
    status: "pending",
  });

  revalidateGroup(groupId);

  // Push to payer with dispute context
  const payerUserId = await getPayerUserId(expense.paidByMemberId);
  if (payerUserId && payerUserId !== user.id) {
    const groupName = await getGroupName(groupId);
    const actorName = membership.displayName ?? membership.guestName ?? "Someone";

    const bodyMap: Record<DisputeType, string> = {
      remove_me:    `${actorName} wants to be removed from "${expense.description}"`,
      change_share: `${actorName} wants to change their share of "${expense.description}"`,
      split_equal:  `${actorName} wants "${expense.description}" split equally`,
      other:        `${actorName} disputed "${expense.description}": ${message ?? ""}`,
      question:     `${actorName} has a question about "${expense.description}"`,
    };

    await sendPushToUser({
      targetUserId: payerUserId,
      groupId,
      title: `${groupName} · Dispute`,
      body: bodyMap[disputeType],
      url: `/groups/${groupId}/expenses/${expenseId}/thread`,
    });
  }

  return { ok: true } as const;
}

// ── cancelMyDispute — withdraws ❓/⚠️ reaction + cancels pending dispute ───────

export async function cancelMyDispute(expenseId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" } as const;

  // Cancel pending dispute
  await db
    .update(expenseDisputes)
    .set({ status: "cancelled", resolvedAt: new Date() })
    .where(
      and(
        eq(expenseDisputes.expenseId, expenseId),
        eq(expenseDisputes.requesterMemberId, membership.id),
        eq(expenseDisputes.status, "pending")
      )
    );

  // Remove ❓/⚠️ reaction
  await db
    .delete(expenseReactions)
    .where(
      and(
        eq(expenseReactions.expenseId, expenseId),
        eq(expenseReactions.memberId, membership.id)
      )
    );

  revalidateGroup(groupId);
  return { ok: true } as const;
}

// ── acceptDispute — payer accepts; auto-updates splits ────────────────────────

export async function acceptDispute(disputeId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [dispute] = await db
    .select()
    .from(expenseDisputes)
    .where(eq(expenseDisputes.id, disputeId));

  if (!dispute) return { ok: false, error: "Dispute not found" } as const;
  if (dispute.status !== "pending") return { ok: false, error: "This dispute is no longer pending" } as const;

  const { expenseId, groupId, requesterMemberId, disputeType, suggestedAmount } = dispute;

  // Must be actionable type
  if (!ACTIONABLE_DISPUTE_TYPES.includes(disputeType as DisputeType)) {
    return { ok: false, error: "This dispute type cannot be auto-resolved" } as const;
  }

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" } as const;

  // Fetch expense to verify payer
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return { ok: false, error: "Expense not found" } as const;

  // Only the payer or a group admin can accept
  const payerUserId = await getPayerUserId(expense.paidByMemberId);
  const isPayer = payerUserId === user.id;
  const isAdmin = membership.role === "admin";
  if (!isPayer && !isAdmin) {
    return { ok: false, error: "Only the expense payer or a group admin can accept disputes" } as const;
  }

  // Get current splits
  const currentSplitRows = await db
    .select({ memberId: expenseSplits.memberId, shareAmount: expenseSplits.shareAmount })
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId));

  const currentSplits = currentSplitRows.map((s) => ({
    memberId: s.memberId,
    shareAmount: Number(s.shareAmount),
  }));
  const expenseAmount = Number(expense.amount);

  // Compute new splits
  let transformResult;
  if (disputeType === "remove_me") {
    transformResult = applyRemoveMe(currentSplits, expenseAmount, requesterMemberId);
  } else if (disputeType === "change_share") {
    if (suggestedAmount === null || suggestedAmount === undefined) {
      return { ok: false, error: "No suggested amount provided" } as const;
    }
    transformResult = applyChangeShare(currentSplits, expenseAmount, requesterMemberId, Number(suggestedAmount));
  } else {
    // split_equal
    transformResult = applySplitEqual(currentSplits, expenseAmount);
  }

  if (!transformResult.ok) return { ok: false, error: transformResult.error } as const;

  const newSplits = transformResult.splits.map((s) => ({
    expenseId,
    groupId,
    memberId:    s.memberId,
    shareAmount: s.shareAmount,
    splitType:   s.splitType as "equal" | "exact",
    splitValue:  s.splitValue,
  }));

  // Atomic DB update
  try {
    await db.transaction(async (tx) => {
      await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
      if (newSplits.length > 0) {
        await tx.insert(expenseSplits).values(newSplits);
      }
      await tx
        .update(expenseDisputes)
        .set({ status: "accepted", resolvedAt: new Date() })
        .where(eq(expenseDisputes.id, disputeId));
      // Remove the ⚠️ reaction since it's resolved
      await tx
        .delete(expenseReactions)
        .where(
          and(
            eq(expenseReactions.expenseId, expenseId),
            eq(expenseReactions.memberId, requesterMemberId)
          )
        );
    });
  } catch (e) {
    console.error("acceptDispute transaction failed:", e);
    return { ok: false, error: "Failed to update the split. Please try again." } as const;
  }

  revalidateGroup(groupId);
  revalidatePath(`/groups/${groupId}`, "layout");

  // Push to requester
  const [requesterRow] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.id, requesterMemberId));

  if (requesterRow?.userId && requesterRow.userId !== user.id) {
    const groupName = await getGroupName(groupId);
    await sendPushToUser({
      targetUserId: requesterRow.userId,
      groupId,
      title: `${groupName} · Split updated ✓`,
      body: `Your request on "${expense.description}" was accepted`,
      url: `/groups/${groupId}/expenses/${expenseId}/thread`,
    });
  }

  return { ok: true } as const;
}

// ── declineDispute — payer declines; notifies requester ───────────────────────

export async function declineDispute(disputeId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const [dispute] = await db
    .select()
    .from(expenseDisputes)
    .where(eq(expenseDisputes.id, disputeId));

  if (!dispute) return { ok: false, error: "Dispute not found" } as const;
  if (dispute.status !== "pending") return { ok: false, error: "This dispute is no longer pending" } as const;

  const { expenseId, groupId, requesterMemberId } = dispute;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" } as const;

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) return { ok: false, error: "Expense not found" } as const;

  const payerUserId = await getPayerUserId(expense.paidByMemberId);
  const isPayer = payerUserId === user.id;
  const isAdmin = membership.role === "admin";
  if (!isPayer && !isAdmin) {
    return { ok: false, error: "Only the expense payer or a group admin can decline disputes" } as const;
  }

  await db
    .update(expenseDisputes)
    .set({ status: "declined", resolvedAt: new Date() })
    .where(eq(expenseDisputes.id, disputeId));

  revalidateGroup(groupId);
  revalidatePath(`/groups/${groupId}`, "layout");

  // Push to requester privately
  const [requesterRow] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.id, requesterMemberId));

  if (requesterRow?.userId && requesterRow.userId !== user.id) {
    const groupName = await getGroupName(groupId);
    await sendPushToUser({
      targetUserId: requesterRow.userId,
      groupId,
      title: groupName,
      body: `Your request on "${expense.description}" was not accepted`,
      url: `/groups/${groupId}/expenses/${expenseId}/thread`,
    });
  }

  return { ok: true } as const;
}

// ── addComment — posts a comment, notifies @mentions + thread participants ────

const commentSchema = z.object({
  expenseId:          z.string().uuid(),
  groupId:            z.string().uuid(),
  content:            z.string().min(1).max(MAX_COMMENT_LENGTH),
  mentionedMemberIds: z.array(z.string().uuid()).max(20),
});

export async function addComment(
  expenseId: string,
  groupId: string,
  content: string,
  mentionedMemberIds: string[] = []
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const parsed = commentSchema.safeParse({
    expenseId,
    groupId,
    content: content.trim(),
    mentionedMemberIds,
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" } as const;

  await db.insert(expenseComments).values({
    expenseId,
    groupId,
    memberId: membership.id,
    content: parsed.data.content,
  });

  revalidateTag(`interactions-${groupId}`, "max");
  revalidatePath(`/groups/${groupId}/expenses/${expenseId}/thread`);

  // ── Push notifications ─────────────────────────────────────────────────────

  const actorName = membership.displayName ?? membership.guestName ?? "Someone";

  // Fetch expense + group name + all group members in parallel
  const [expenseRows, allGroupMembers, groupName] = await Promise.all([
    db
      .select({ description: expenses.description, paidByMemberId: expenses.paidByMemberId })
      .from(expenses)
      .where(eq(expenses.id, expenseId)),
    db
      .select({ userId: groupMembers.userId, id: groupMembers.id })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId)),
    getGroupName(groupId),
  ]);

  const expense = expenseRows[0];
  const expenseName = expense?.description ?? "an expense";

  // ── Tier 1: @mentioned members ─────────────────────────────────────────────
  const mentionedUserIds = new Set<string>();
  if (parsed.data.mentionedMemberIds.length > 0) {
    const mentionTargets = allGroupMembers.filter(
      (m) =>
        m.userId &&
        m.userId !== user.id &&
        parsed.data.mentionedMemberIds.includes(m.id)
    );

    await Promise.all(
      mentionTargets.map((m) =>
        sendPushToUser({
          targetUserId: m.userId!,
          groupId,
          title: `${groupName} · @mention`,
          body: `${actorName} mentioned you on "${expenseName}"`,
          url: `/groups/${groupId}/expenses/${expenseId}/thread`,
        })
      )
    );
    mentionTargets.forEach((m) => mentionedUserIds.add(m.userId!));
  }

  // ── Tier 2: payer + prior commenters (not already @mentioned, not commenter) ─
  if (expense) {
    // Fetch prior commenters on this expense, excluding the current commenter
    const priorCommenterRows = await db
      .select({ memberId: expenseComments.memberId })
      .from(expenseComments)
      .where(
        and(
          eq(expenseComments.expenseId, expenseId),
          ne(expenseComments.memberId, membership.id)
        )
      );

    const participantMemberIds = new Set([
      expense.paidByMemberId,
      ...priorCommenterRows.map((c) => c.memberId),
    ]);
    participantMemberIds.delete(membership.id); // exclude commenter

    const participantTargets = allGroupMembers.filter(
      (m) =>
        m.userId &&
        m.userId !== user.id &&
        !mentionedUserIds.has(m.userId) &&
        participantMemberIds.has(m.id)
    );

    await Promise.all(
      participantTargets.map((m) =>
        sendPushToUser({
          targetUserId: m.userId!,
          groupId,
          title: `${groupName} · New comment`,
          body: `${actorName} commented on "${expenseName}"`,
          url: `/groups/${groupId}/expenses/${expenseId}/thread`,
        })
      )
    );
  }

  return { ok: true } as const;
}

// ── deleteComment — own comment or admin ─────────────────────────────────────

export async function deleteComment(commentId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" } as const;

  const membership = await getMembership(groupId, user.id);
  if (!membership) return { ok: false, error: "Not a member of this group" } as const;

  const [comment] = await db
    .select({ memberId: expenseComments.memberId, expenseId: expenseComments.expenseId })
    .from(expenseComments)
    .where(eq(expenseComments.id, commentId));

  if (!comment) return { ok: false, error: "Comment not found" } as const;

  const isOwner = comment.memberId === membership.id;
  const isAdmin = membership.role === "admin";
  if (!isOwner && !isAdmin) {
    return { ok: false, error: "You can only delete your own comments" } as const;
  }

  await db.delete(expenseComments).where(eq(expenseComments.id, commentId));

  revalidateTag(`interactions-${groupId}`, "max");
  revalidatePath(`/groups/${groupId}/expenses/${comment.expenseId}/thread`);
  return { ok: true } as const;
}
