import "server-only";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { count, eq } from "drizzle-orm";

// ── Pricing — imported from client-safe prices.ts (single source of truth) ───
// BUG-11 fix: constants previously duplicated here; now re-exported from
// prices.ts so client components (billing-section.tsx) can import them too.
export {
  FOUNDER_PRICE,
  REGULAR_PRICE,
  FOUNDER_ANNUAL_MONTHLY_EQUIV,
  REGULAR_ANNUAL_MONTHLY_EQUIV,
  FOUNDER_ANNUAL_SAVINGS,
  REGULAR_ANNUAL_SAVINGS,
} from "./prices";

// ── Founder slot configuration ─────────────────────────────────────────────────

/** Maximum number of subscribers who lock in founder pricing. */
export const FOUNDER_SLOTS_TOTAL = 500;

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
