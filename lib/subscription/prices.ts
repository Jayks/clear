/**
 * Subscription pricing constants — client-safe (no "server-only" import).
 *
 * These are the single source of truth for price numbers.  Both server-only
 * modules (founder.ts, gates.ts) and client components (billing-section.tsx)
 * import from here so prices are never duplicated or hardcoded in UI.
 *
 * BUG-11 fix: billing-section.tsx previously hardcoded ₹49/month and ₹499/year
 * which were stale values that no longer matched the actual pricing.
 */

/** Founder pricing — locked in forever for the first FOUNDER_SLOTS_TOTAL subscribers. */
export const FOUNDER_PRICE = { monthly: 79, annual: 699 } as const;

/** Regular pricing after founder slots are filled. */
export const REGULAR_PRICE = { monthly: 99, annual: 799 } as const;

/**
 * Effective per-month cost when billed annually (floored).
 * Founder: ₹699 ÷ 12 = ₹58.25 → ₹58
 * Regular: ₹799 ÷ 12 = ₹66.58 → ₹66
 */
export const FOUNDER_ANNUAL_MONTHLY_EQUIV = Math.floor(FOUNDER_PRICE.annual / 12); // 58
export const REGULAR_ANNUAL_MONTHLY_EQUIV = Math.floor(REGULAR_PRICE.annual / 12); // 66

/**
 * Rupee savings when paying annually vs paying regular monthly for 12 months.
 * Founder annual:  ₹99 × 12 − ₹699 = ₹489
 * Regular annual:  ₹99 × 12 − ₹799 = ₹389
 */
export const FOUNDER_ANNUAL_SAVINGS = REGULAR_PRICE.monthly * 12 - FOUNDER_PRICE.annual; // 489
export const REGULAR_ANNUAL_SAVINGS = REGULAR_PRICE.monthly * 12 - REGULAR_PRICE.annual; // 389
