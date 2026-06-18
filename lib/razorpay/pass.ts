/**
 * Maps a pass purchase to its price in paise (the unit Razorpay's Orders API
 * expects). Pure — pulls from `lib/subscription/prices.ts`, the single source
 * of truth for price numbers, so nothing is duplicated/hardcoded here. See
 * RAZORPAY_PLAN.md §6.
 */

import type { PassType } from "../subscription/entitlement";
import { EARLY_BIRD_PRICE, REGULAR_PRICE } from "../subscription/prices";

/** pass_30d → the monthly price; annual → the annual price. ×100 for paise. */
export function getPassAmountPaise(passType: PassType, earlyBird: boolean): number {
  const price = earlyBird ? EARLY_BIRD_PRICE : REGULAR_PRICE;
  const rupees = passType === "pass_30d" ? price.monthly : price.annual;
  return rupees * 100;
}
