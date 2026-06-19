/**
 * Resolves which Razorpay credential pair (test/live) is active right now.
 * Lets both key pairs sit in Vercel simultaneously — flipping environments is
 * a one-line `RAZORPAY_MODE` edit + redeploy, never re-pasting a live secret.
 * See RAZORPAY_PLAN.md §2/§6.
 *
 * No `import "server-only"` here (unlike early-bird.ts) — Vitest can't
 * resolve that package outside Next.js's bundler, and `resolveRazorpayMode`
 * needs to stay unit-testable. Safe regardless: this module is only ever
 * imported by other server-only files (actions, route handlers, client.ts).
 */

export type RazorpayMode = "test" | "live";

/**
 * Pure: defaults to "test" for anything other than the exact literal "live".
 * Fail-safe — a missing/misconfigured RAZORPAY_MODE must never accidentally
 * enable real charges.
 */
export function resolveRazorpayMode(raw: string | undefined): RazorpayMode {
  return raw === "live" ? "live" : "test";
}

export function getRazorpayMode(): RazorpayMode {
  return resolveRazorpayMode(process.env.RAZORPAY_MODE);
}

export function getRazorpayKeyId(mode: RazorpayMode): string | undefined {
  return mode === "live" ? process.env.RAZORPAY_LIVE_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID;
}

export function getRazorpayKeySecret(mode: RazorpayMode): string | undefined {
  return mode === "live" ? process.env.RAZORPAY_LIVE_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;
}

export function getRazorpayWebhookSecret(mode: RazorpayMode): string | undefined {
  return mode === "live" ? process.env.RAZORPAY_LIVE_WEBHOOK_SECRET : process.env.RAZORPAY_TEST_WEBHOOK_SECRET;
}
