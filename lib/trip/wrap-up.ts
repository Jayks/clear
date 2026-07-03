import { formatCurrency } from "@/lib/utils";

/**
 * Pure "has this trip wrapped up" condition — shared by the wrap-up card
 * (Phase 3, `RepeatTripPrompt`) and the Home-page lazy notification check
 * (Phase 4). Extracted verbatim from the inline condition that already
 * gated `RepeatTripPrompt` in `app/(app)/groups/[id]/page.tsx`.
 *
 * A trip is "wrapped up" when: it's a trip (not a nest), the viewer is its
 * admin, and it's either archived or its end date has passed (strictly
 * before today — the last day itself doesn't count as "over" yet).
 */
export function isTripWrapUpDue(params: {
  groupType: string;
  isAdmin: boolean;
  isArchived: boolean;
  endDate: string | null;
  today: string; // "yyyy-MM-dd"
}): boolean {
  const { groupType, isAdmin, isArchived, endDate, today } = params;
  if (groupType !== "trip" || !isAdmin) return false;
  return isArchived || (!!endDate && endDate < today);
}

/**
 * Direction-aware settle-nudge copy for the wrap-up card. Returns `null`
 * when the viewer is (effectively) fully settled — same `±0.005` epsilon
 * `SettleBalanceBadge` already uses (balances are float sums, so an exact
 * `=== 0` check would treat a rounding artifact like `0.001` as a real
 * amount owed).
 */
export function getSettleNudgeCopy(net: number, currency: string): string | null {
  if (net >= -0.005 && net <= 0.005) return null;
  const amount = formatCurrency(Math.abs(net), currency);
  return net > 0
    ? `You're owed ${amount} for this trip`
    : `You owe ${amount} for this trip`;
}
