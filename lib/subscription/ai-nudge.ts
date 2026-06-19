/**
 * Celebratory AI-scan upgrade nudge (RAZORPAY_PLAN.md §10 / M4). Pure
 * eligibility check — fires post-save (never blocks a scan in progress),
 * gain-framed, no "X scans left" fuel gauge. Session-guard (one nudge per
 * browser session) and the actual scan count live outside this module
 * (sessionStorage + a DB count respectively) since both are impure/I-O.
 */
export const AI_NUDGE_SCAN_THRESHOLD = 25;

export function shouldShowAiNudge(scanCount: number, plan: "plus" | "free"): boolean {
  return plan === "free" && scanCount >= AI_NUDGE_SCAN_THRESHOLD;
}
