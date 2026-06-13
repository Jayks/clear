import { describe, it, expect } from "vitest";

/**
 * Documents the logging-AI free monthly ceiling logic in lib/subscription/ai-quota.ts.
 * That module imports the DB client, so it can't be imported directly in a unit
 * test — keep the ceiling value here in sync with FREE_AI_MONTHLY_CEILING.
 *
 * Logging-AI (receipt scan / NL quick-add / chat import) is FREE for everyone;
 * the ceiling is a SILENT abuse circuit breaker, never shown in the UI.
 */
const FREE_AI_MONTHLY_CEILING = 50;

describe("logging-AI free monthly ceiling", () => {
  function canUseLoggingAI(monthlyCount: number, plan: "free" | "plus"): boolean {
    if (plan === "plus") return true;
    return monthlyCount < FREE_AI_MONTHLY_CEILING;
  }

  it("plus/trialing is uncapped", () => {
    expect(canUseLoggingAI(9999, "plus")).toBe(true);
  });

  it("free is allowed below the ceiling", () => {
    expect(canUseLoggingAI(0, "free")).toBe(true);
    expect(canUseLoggingAI(49, "free")).toBe(true);
  });

  it("free is blocked at and above the ceiling", () => {
    expect(canUseLoggingAI(50, "free")).toBe(false);
    expect(canUseLoggingAI(51, "free")).toBe(false);
  });

  it("ceiling stays above the ~30/mo heavy-use estimate (headroom for real users)", () => {
    expect(FREE_AI_MONTHLY_CEILING).toBeGreaterThan(30);
  });

  // incrementLoggingAiUsage is a no-op for Plus (uncapped → no need to count)
  function shouldIncrement(plan: "free" | "plus"): boolean {
    return plan !== "plus";
  }
  it("only free-tier usage is counted", () => {
    expect(shouldIncrement("free")).toBe(true);
    expect(shouldIncrement("plus")).toBe(false);
  });

  // Period key is 'YYYY-MM' (one counter row per user per month)
  function currentPeriod(d: Date): string {
    return d.toISOString().slice(0, 7);
  }
  it("period key is YYYY-MM", () => {
    expect(currentPeriod(new Date("2026-06-15T10:00:00Z"))).toBe("2026-06");
    expect(currentPeriod(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });
});
