import "server-only";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { count, eq } from "drizzle-orm";

// ── Founder slot configuration ─────────────────────────────────────────────────

/** Maximum number of subscribers who lock in founder pricing. */
export const FOUNDER_SLOTS_TOTAL = 500;

// ── Pricing ────────────────────────────────────────────────────────────────────

/** Founder pricing — locked in forever for the first FOUNDER_SLOTS_TOTAL subscribers. */
export const FOUNDER_PRICE = { monthly: 79, annual: 699 } as const;

/** Regular pricing after founder slots are filled. */
export const REGULAR_PRICE = { monthly: 99, annual: 799 } as const;

// ── Pre-computed savings (derived from prices above) ──────────────────────────

/**
 * Effective per-month cost when billed annually.
 * Floored so we never over-promise (₹58.25 → ₹58).
 */
export const FOUNDER_ANNUAL_MONTHLY_EQUIV = Math.floor(FOUNDER_PRICE.annual / 12); // 58
export const REGULAR_ANNUAL_MONTHLY_EQUIV = Math.floor(REGULAR_PRICE.annual / 12); // 66

/**
 * Rupee savings when paying annually vs paying the *regular* monthly rate for 12 months.
 * This is the most compelling comparison — it captures both the annual discount *and*
 * the founder discount in a single number.
 *
 * Founder annual:  ₹99 × 12 − ₹699 = ₹489
 * Regular annual:  ₹99 × 12 − ₹799 = ₹389
 */
export const FOUNDER_ANNUAL_SAVINGS = REGULAR_PRICE.monthly * 12 - FOUNDER_PRICE.annual; // 489
export const REGULAR_ANNUAL_SAVINGS = REGULAR_PRICE.monthly * 12 - REGULAR_PRICE.annual; // 389

// ── DB query ───────────────────────────────────────────────────────────────────

/**
 * Count of subscribers with status = 'active'.
 * Trialing users (default state for new sign-ups) are not counted — only those
 * who have explicitly activated Plus (or will have paid after Razorpay goes live).
 * Fails open (returns 0) — better to show founder pricing than to block it on a DB error.
 */
export async function getFounderSlotsClaimed(): Promise<number> {
  try {
    const [row] = await db
      .select({ total: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));
    return Number(row?.total ?? 0);
  } catch {
    return 0;
  }
}

/** Returns true while founder slots are still available. */
export function isFounderActive(claimed: number): boolean {
  return claimed < FOUNDER_SLOTS_TOTAL;
}
