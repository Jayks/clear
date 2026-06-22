import { format } from "date-fns";
import { BRAND } from "../brand";

/**
 * Overflow read-only lock — the "stock" half of the flow/stock degradation split
 * (RAZORPAY_PLAN.md §9). Flow benefits (AI, templates, budgets, CSV, insights) all
 * self-heal on lapse via live plan checks elsewhere — no code needed for those.
 *
 * This module exists only for the group cap: a user who created >5 active groups
 * while Plus and then lapses to Free must not lose data, but only 5 stay
 * active/editable. Read-time derived — no lapse-time mutation, no migration.
 *
 * Deliberately PURE and DB-free (no `@/` imports) so it unit-tests directly —
 * same split as `receipt-retention.ts`. DB-backed callers live in
 * `degradation-queries.ts` (vitest can't resolve the `@/` path alias, so any file
 * touching `@/lib/db/client` can't be imported straight into a test — see
 * `gates-model.test.ts`'s header comment for the established precedent).
 */

export const FREE_GROUP_CAP = 5;

/** Shared copy for every write-guard that refuses on a locked group — one voice, not scattered messages. */
export const LOCKED_GROUP_ERROR =
  `This group is read-only on the Free plan (5-group limit). Upgrade to ${BRAND.plus} to keep editing it.`;

export interface LockCheckGroup {
  id: string;
  /** Proxy for "recently used" — latest expense activity, or group creation if none. */
  lastActiveAt: Date;
  /** A live trip (today within start/end) is graced — never locked mid-journey. */
  isActiveTrip: boolean;
}

/**
 * Pure: given an admin's active groups, decide which stay locked on Free.
 * The `cap` most-recently-active groups (excluding active trips, which are always
 * exempt) stay unlocked; everything else beyond that locks. Plus = nothing locks.
 */
export function selectLockedGroups(
  groupList: LockCheckGroup[],
  plan: "plus" | "free",
  cap: number = FREE_GROUP_CAP,
): Set<string> {
  if (plan === "plus") return new Set();
  const lockable = groupList.filter((g) => !g.isActiveTrip); // active-trip grace
  const sorted = [...lockable].sort((a, b) => +b.lastActiveAt - +a.lastActiveAt);
  return new Set(sorted.slice(cap).map((g) => g.id));
}

/**
 * Pure: is `groupType` a trip currently mid-journey (today within start/end,
 * inclusive)? Reuses the receipt-retention "still active" precedent, but unlike
 * that function this requires BOTH bounds — an undated/open-ended group isn't
 * "mid-journey" in any verifiable sense, so it gets no special grace here (it's
 * just judged on recency like anything else). Nests/circles never qualify.
 */
export function isCurrentlyActiveTrip(
  groupType: "trip" | "nest" | "circle",
  startDate: string | null,
  endDate: string | null,
  now: Date,
): boolean {
  if (groupType !== "trip") return false;
  if (!startDate || !endDate) return false;
  const today = format(now, "yyyy-MM-dd");
  return startDate <= today && today <= endDate;
}
