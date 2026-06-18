import { format } from "date-fns";

/**
 * Free-tier receipt-photo retention policy (Phase 3b — "receipt vault" Plus perk).
 *
 * Only the image *bytes* are ever subject to expiry. The extracted data
 * (`receiptItems`, `receiptScannedAt`, amount) always stays in the DB, so the
 * "✨ scanned with AI" badge and the line-item breakdown persist forever — only
 * the photo viewer goes dark for an expired free-tier receipt.
 *
 * Rule:
 *  - Plus group  → permanent vault, never prune.
 *  - Free group  → prune once the photo is older than RECEIPT_RETENTION_DAYS,
 *    UNLESS the owning group is a still-active trip. A live trip keeps its
 *    proofs regardless of age (the settle-up window hasn't opened yet); nests,
 *    circles, and ended/archived trips prune at the window.
 *
 * KNOWN GAP (M1, deferred to M2 — RAZORPAY_PLAN.md §9 "Receipt vault — grandfather"):
 * `plan` here is always the admin's CURRENT plan (from `getGroupsAdminPlans` at
 * prune-time). A receipt captured while Plus, on a group whose admin has since
 * lapsed to Free, is therefore NOT grandfathered today — it prunes at the normal
 * window like any free-tier receipt. `subscriptions` only stores the latest
 * `currentPeriodEnd`, with no history of past Plus windows, so there's nothing to
 * check it against yet. Planned fix once M2's payment ledger exists: a sticky
 * `expenses.receipt_permanent` flag set at capture time (was the admin Plus right
 * then?), checked here in addition to the live `plan`. Do not invent a throwaway
 * heuristic in the meantime — this needs that schema column to be correct.
 */
export const RECEIPT_RETENTION_DAYS = 60;

export interface ReceiptRetentionInput {
  /** Group admin's plan — Plus covers all members. */
  plan:       "plus" | "free";
  /** When the expense (and thus the proof) was created. */
  createdAt:  Date;
  groupType:  "trip" | "nest" | "circle";
  /** Trip end date as 'YYYY-MM-DD', or null for open-ended / non-trips. */
  endDate:    string | null;
  isArchived: boolean;
  /** Injected so the function stays pure + unit-testable. */
  now:        Date;
}

/** True when an active (non-archived) trip is still ongoing — keep proofs. */
function isTripStillActive(endDate: string | null, now: Date): boolean {
  if (!endDate) return true; // open-ended trip → treat as active
  // Date-string comparison on 'yyyy-MM-dd' — same approach as insights trip-state.
  return endDate >= format(now, "yyyy-MM-dd");
}

export function isReceiptExpired(input: ReceiptRetentionInput): boolean {
  const { plan, createdAt, groupType, endDate, isArchived, now } = input;

  // Plus = permanent vault.
  if (plan === "plus") return false;

  const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Within the retention window — always keep.
  if (ageDays <= RECEIPT_RETENTION_DAYS) return false;

  // Past the window: a still-active trip keeps its proofs regardless of age.
  if (groupType === "trip" && !isArchived && isTripStillActive(endDate, now)) {
    return false;
  }

  return true;
}
