/**
 * Entitlement model — the core of the Razorpay pass-purchase flow.
 *
 * `isPlus = plusUntil > now`. Lazy expiry: nothing ever downgrades a row, a
 * lapsed `currentPeriodEnd` just naturally stops satisfying that check (see
 * gates.ts). Pure on purpose so it unit-tests without a DB — see
 * RAZORPAY_PLAN.md §4.
 */

export const PASS_DURATION_DAYS = { pass_30d: 30, annual: 365 } as const;
export type PassType = keyof typeof PASS_DURATION_DAYS;

/**
 * Compute the new entitlement expiry when a pass is purchased.
 * Stacks on remaining time if the current entitlement is still in the
 * future; otherwise (null, or already lapsed) extends from `now`.
 */
export function extendEntitlement(current: Date | null, passType: PassType, now: Date): Date {
  const base = current && current > now ? current : now;
  const d = new Date(base);
  d.setDate(d.getDate() + PASS_DURATION_DAYS[passType]);
  return d;
}
