import { db } from "@/lib/db/client";
import { expenseReactions, type ReactionEmoji } from "@/lib/db/schema/expense-reactions";
import { expenseComments } from "@/lib/db/schema/expense-comments";
import { expenseDisputes, type DisputeType } from "@/lib/db/schema/expense-disputes";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, inArray, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// ── Shared types ─────────────────────────────────────────────────────────────

export type ReactionRow = {
  emoji: ReactionEmoji;
  memberId: string;
  memberName: string;
};

export type CommentRow = {
  id: string;
  content: string;
  createdAt: Date;
  memberId: string;
  memberName: string;
};

export type DisputeRow = {
  id: string;
  type: DisputeType;
  status: string;
  requesterMemberId: string;
  requesterName: string;
  suggestedAmount: number | null;
  message: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

// Per-expense summary used to drive card signals in the expense list.
export type ExpenseInteractionCount = {
  // Count per reaction emoji key
  reactions: Partial<Record<ReactionEmoji, number>>;
  // Which emoji the current user reacted with (null = no reaction)
  myReaction: ReactionEmoji | null;
  commentCount: number;
  // First pending dispute on this expense (null = none)
  pendingDispute: {
    id: string;
    type: DisputeType;
    requestedByMe: boolean;
  } | null;
};

// ── Batch counts — called from the expenses page (no cache; fresh per render) ─
// Runs 3 lightweight queries in parallel for the current page's expense IDs.
// Not wrapped in unstable_cache because the key would need to encode expenseIds,
// which changes with pagination. Page-level RSC caching is sufficient here.

export async function getExpenseInteractionCounts(
  expenseIds: string[],
  currentMemberId: string
): Promise<Record<string, ExpenseInteractionCount>> {
  if (expenseIds.length === 0) return {};

  const [reactionRows, commentRows, disputeRows] = await Promise.all([
    db
      .select({
        expenseId: expenseReactions.expenseId,
        emoji:     expenseReactions.emoji,
        memberId:  expenseReactions.memberId,
      })
      .from(expenseReactions)
      .where(inArray(expenseReactions.expenseId, expenseIds)),

    db
      .select({ expenseId: expenseComments.expenseId })
      .from(expenseComments)
      .where(inArray(expenseComments.expenseId, expenseIds)),

    db
      .select({
        id:                 expenseDisputes.id,
        expenseId:          expenseDisputes.expenseId,
        disputeType:        expenseDisputes.disputeType,
        requesterMemberId:  expenseDisputes.requesterMemberId,
      })
      .from(expenseDisputes)
      .where(
        and(
          inArray(expenseDisputes.expenseId, expenseIds),
          eq(expenseDisputes.status, "pending")
        )
      ),
  ]);

  // Initialise a result entry for every expenseId
  const result: Record<string, ExpenseInteractionCount> = {};
  for (const id of expenseIds) {
    result[id] = { reactions: {}, myReaction: null, commentCount: 0, pendingDispute: null };
  }

  for (const row of reactionRows) {
    const entry = result[row.expenseId];
    if (!entry) continue;
    const emoji = row.emoji as ReactionEmoji;
    entry.reactions[emoji] = (entry.reactions[emoji] ?? 0) + 1;
    if (row.memberId === currentMemberId) entry.myReaction = emoji;
  }

  for (const row of commentRows) {
    const entry = result[row.expenseId];
    if (entry) entry.commentCount++;
  }

  for (const row of disputeRows) {
    const entry = result[row.expenseId];
    if (entry && !entry.pendingDispute) {
      entry.pendingDispute = {
        id:              row.id,
        type:            row.disputeType as DisputeType,
        requestedByMe:   row.requesterMemberId === currentMemberId,
      };
    }
  }

  return result;
}

// ── Per-expense reactions — detail sheet + thread page header ────────────────

async function _fetchReactions(expenseId: string): Promise<ReactionRow[]> {
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

export async function getExpenseReactions(
  expenseId: string,
  groupId: string
): Promise<ReactionRow[]> {
  const fn = unstable_cache(
    () => _fetchReactions(expenseId),
    ["interactions-reactions", expenseId],
    { tags: [`interactions-${groupId}`] }
  );
  return fn();
}

// ── Comments — thread page ───────────────────────────────────────────────────

async function _fetchComments(expenseId: string): Promise<CommentRow[]> {
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
}

export async function getExpenseComments(
  expenseId: string,
  groupId: string
): Promise<CommentRow[]> {
  const fn = unstable_cache(
    () => _fetchComments(expenseId),
    ["interactions-comments", expenseId],
    { tags: [`interactions-${groupId}`] }
  );
  return fn();
}

// ── Disputes — detail sheet + thread page ───────────────────────────────────

async function _fetchDisputes(expenseId: string): Promise<DisputeRow[]> {
  const rows = await db
    .select({
      id:                 expenseDisputes.id,
      disputeType:        expenseDisputes.disputeType,
      status:             expenseDisputes.status,
      requesterMemberId:  expenseDisputes.requesterMemberId,
      suggestedAmount:    expenseDisputes.suggestedAmount,
      message:            expenseDisputes.message,
      createdAt:          expenseDisputes.createdAt,
      resolvedAt:         expenseDisputes.resolvedAt,
      displayName:        groupMembers.displayName,
      guestName:          groupMembers.guestName,
    })
    .from(expenseDisputes)
    .leftJoin(groupMembers, eq(groupMembers.id, expenseDisputes.requesterMemberId))
    .where(eq(expenseDisputes.expenseId, expenseId))
    .orderBy(expenseDisputes.createdAt);

  return rows.map((r) => ({
    id:                 r.id,
    type:               r.disputeType as DisputeType,
    status:             r.status,
    requesterMemberId:  r.requesterMemberId,
    requesterName:      r.displayName ?? r.guestName ?? "Member",
    suggestedAmount:    r.suggestedAmount !== null ? Number(r.suggestedAmount) : null,
    message:            r.message,
    createdAt:          r.createdAt,
    resolvedAt:         r.resolvedAt,
  }));
}

export async function getExpenseDisputes(
  expenseId: string,
  groupId: string
): Promise<DisputeRow[]> {
  const fn = unstable_cache(
    () => _fetchDisputes(expenseId),
    ["interactions-disputes", expenseId],
    { tags: [`interactions-${groupId}`] }
  );
  return fn();
}
