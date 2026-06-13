import "server-only";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { count, eq } from "drizzle-orm";

// ── Pricing — imported from client-safe prices.ts (single source of truth) ───
// Re-exported so client components (billing-section.tsx) can import them too.
export {
  EARLY_BIRD_PRICE,
  REGULAR_PRICE,
  EARLY_BIRD_ANNUAL_MONTHLY_EQUIV,
  REGULAR_ANNUAL_MONTHLY_EQUIV,
  EARLY_BIRD_ANNUAL_SAVINGS,
  REGULAR_ANNUAL_SAVINGS,
} from "./prices";

// ── Early-bird slot configuration ────────────────────────────────────────────

/** Maximum number of subscribers who lock in early-bird pricing. */
export const EARLY_BIRD_SLOTS_TOTAL = 300;

// ── DB query ───────────────────────────────────────────────────────────────────

/**
 * Count of subscribers with status = 'active'.
 * Trialing users (default state for new sign-ups) are not counted — only those
 * who have explicitly activated Plus (or will have paid after Razorpay goes live).
 * Fails open (returns 0) — better to show early-bird pricing than to block it on a DB error.
 */
export async function getEarlyBirdSlotsClaimed(): Promise<number> {
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

/** Returns true while early-bird slots are still available. */
export function isEarlyBirdActive(claimed: number): boolean {
  return claimed < EARLY_BIRD_SLOTS_TOTAL;
}
