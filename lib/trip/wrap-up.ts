import { formatCurrency } from "@/lib/utils";
import type { NotificationType } from "@/lib/db/schema/notifications";

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

/**
 * Pure payload builder for the Phase 4 trip-wrap-up notification
 * (`NOTIFiCATIONS_INBOX_PLAN.md` §3.3b). Kept separate from the DB-touching
 * `checkTripWrapUps` orchestrator (`lib/notifications/trip-wrapup-check.ts`)
 * so the copy/shape is unit-testable without a DB. `dedupKey` is what makes
 * repeat Home-page visits after the first a no-op — the wrap-up event
 * fires once per trip, ever.
 */
export function buildTripWrapUpNotification(params: {
  userId: string;
  groupId: string;
  groupName: string;
}): {
  userId: string;
  groupId: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  dedupKey: string;
} {
  const { userId, groupId, groupName } = params;
  return {
    userId,
    groupId,
    type: "trip_wrapup",
    title: "🎉 Trip wrapped up",
    body: `${groupName} has ended — settle up or share the recap.`,
    url: `/groups/${groupId}`,
    dedupKey: `trip_wrapup:${groupId}`,
  };
}
