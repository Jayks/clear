/**
 * Pure functions that compute new expense_splits after a dispute is accepted.
 * No DB access — fully testable in isolation.
 */

import { computeEqual } from "../splits/compute";

export type CurrentSplit = { memberId: string; shareAmount: number };

export type ResolvedSplit = {
  memberId: string;
  shareAmount: string; // numeric string — matches Drizzle insert type
  splitType: "equal" | "exact";
  splitValue: string;
};

export type SplitTransformResult =
  | { ok: true; splits: ResolvedSplit[] }
  | { ok: false; error: string };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * remove_me — remove the requester from the split, redistribute equally.
 * Fails if the requester is the only member.
 */
export function applyRemoveMe(
  currentSplits: CurrentSplit[],
  expenseAmount: number,
  requesterMemberId: string
): SplitTransformResult {
  const remaining = currentSplits.filter((s) => s.memberId !== requesterMemberId);

  if (remaining.length === 0) {
    return { ok: false, error: "Cannot remove the only member from a split." };
  }

  const results = computeEqual(
    expenseAmount,
    remaining.map((s) => s.memberId)
  );

  return {
    ok: true,
    splits: results.map((s) => ({
      memberId: s.memberId,
      shareAmount: String(s.shareAmount),
      splitType: "equal",
      splitValue: String(s.shareAmount),
    })),
  };
}

/**
 * change_share — requester gets an exact suggestedAmount;
 * the remainder is split equally among everyone else.
 * Fails if suggestedAmount is negative or exceeds the total.
 */
export function applyChangeShare(
  currentSplits: CurrentSplit[],
  expenseAmount: number,
  requesterMemberId: string,
  suggestedAmount: number
): SplitTransformResult {
  if (suggestedAmount < 0) {
    return { ok: false, error: "Share amount cannot be negative." };
  }
  if (round2(suggestedAmount) > round2(expenseAmount)) {
    return { ok: false, error: "Share amount cannot exceed the total expense amount." };
  }

  const requesterShare = round2(suggestedAmount);
  const others = currentSplits.filter((s) => s.memberId !== requesterMemberId);
  const remainingAmount = round2(expenseAmount - requesterShare);

  const requesterSplit: ResolvedSplit = {
    memberId: requesterMemberId,
    shareAmount: String(requesterShare),
    splitType: "exact",
    splitValue: String(requesterShare),
  };

  if (others.length === 0) {
    // Requester is the only member — give them the full amount regardless
    return { ok: true, splits: [requesterSplit] };
  }

  if (remainingAmount <= 0) {
    // Requester takes it all; others get 0
    return {
      ok: true,
      splits: [
        requesterSplit,
        ...others.map((o) => ({
          memberId: o.memberId,
          shareAmount: "0",
          splitType: "exact" as const,
          splitValue: "0",
        })),
      ],
    };
  }

  const otherResults = computeEqual(
    remainingAmount,
    others.map((o) => o.memberId)
  );

  return {
    ok: true,
    splits: [
      requesterSplit,
      ...otherResults.map((s) => ({
        memberId: s.memberId,
        shareAmount: String(s.shareAmount),
        splitType: "equal" as const,
        splitValue: String(s.shareAmount),
      })),
    ],
  };
}

/**
 * split_equal — redistribute the full expense equally among ALL current members.
 * Fails if there are no members.
 */
export function applySplitEqual(
  currentSplits: CurrentSplit[],
  expenseAmount: number
): SplitTransformResult {
  if (currentSplits.length === 0) {
    return { ok: false, error: "No members to split among." };
  }

  const results = computeEqual(
    expenseAmount,
    currentSplits.map((s) => s.memberId)
  );

  return {
    ok: true,
    splits: results.map((s) => ({
      memberId: s.memberId,
      shareAmount: String(s.shareAmount),
      splitType: "equal",
      splitValue: String(s.shareAmount),
    })),
  };
}
