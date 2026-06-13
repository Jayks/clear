/**
 * Subscription pricing constants — client-safe (no "server-only" import).
 *
 * These are the single source of truth for price numbers.  Both server-only
 * modules (early-bird.ts, gates.ts) and client components (billing-section.tsx)
 * import from here so prices are never duplicated or hardcoded in UI.
 *
 * Pricing model (June 2026): "premium-but-fair" — we don't undercut Splitkaro
 * (~₹37.5/mo); we win on a generous free tier + value. Early Bird is a
 * deliberate loss-leader for the first 300 subscribers to seed traction.
 */

/** Early-bird pricing — locked in forever for the first EARLY_BIRD_SLOTS_TOTAL subscribers. */
export const EARLY_BIRD_PRICE = { monthly: 49, annual: 499 } as const;

/** Regular Plus pricing after early-bird slots are filled. */
export const REGULAR_PRICE = { monthly: 79, annual: 699 } as const;

/**
 * Effective per-month cost when billed annually (floored).
 * Early Bird: ₹499 ÷ 12 = ₹41.58 → ₹41
 * Regular:    ₹699 ÷ 12 = ₹58.25 → ₹58
 */
export const EARLY_BIRD_ANNUAL_MONTHLY_EQUIV = Math.floor(EARLY_BIRD_PRICE.annual / 12); // 41
export const REGULAR_ANNUAL_MONTHLY_EQUIV = Math.floor(REGULAR_PRICE.annual / 12); // 58

/**
 * Honest per-tier annual savings vs paying THAT tier's own monthly for 12 months.
 * Early Bird: ₹49 × 12 − ₹499 = ₹89
 * Regular:    ₹79 × 12 − ₹699 = ₹249
 */
export const EARLY_BIRD_ANNUAL_SAVINGS = EARLY_BIRD_PRICE.monthly * 12 - EARLY_BIRD_PRICE.annual; // 89
export const REGULAR_ANNUAL_SAVINGS = REGULAR_PRICE.monthly * 12 - REGULAR_PRICE.annual; // 249
