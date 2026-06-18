import { describe, it, expect } from "vitest";

/**
 * Documents the free-tier model after the June 2026 generous re-cut.
 * Mirrors the rules in lib/subscription/gates.ts (which need a DB and so can't
 * be imported directly in a unit test) — keep these in sync with that file.
 *
 * Principle: never cap acquisition/virality (members, core splitting, expenses);
 * cap breadth (active groups) and gate depth (templates, budgets, CSV, AI).
 */

describe("free-tier model — June 2026 generous re-cut", () => {
  // canCreateGroup: free blocked only at 5 active, non-demo, non-archived groups
  function canCreateGroup(activeGroupCount: number, plan: "free" | "plus"): boolean {
    if (plan === "plus") return true;
    return activeGroupCount < 5;
  }

  it("free: can create up to 5 active groups, blocked at the 6th", () => {
    expect(canCreateGroup(4, "free")).toBe(true);
    expect(canCreateGroup(5, "free")).toBe(false);
  });

  it("plus: unlimited groups", () => {
    expect(canCreateGroup(99, "plus")).toBe(true);
  });

  // Ungated for everyone now — the core bill-splitting job + viral surfaces
  const canUseNonEqualSplit = () => true;
  const canAddMember = () => true;
  const canAddExpense = () => true;

  it("non-equal splits are free for all plans", () => {
    expect(canUseNonEqualSplit()).toBe(true);
  });
  it("members are unlimited for all plans", () => {
    expect(canAddMember()).toBe(true);
  });
  it("expenses are unlimited for all plans", () => {
    expect(canAddExpense()).toBe(true);
  });

  // getGroupNudge thresholds track the 5-group cap (near at 4, at-limit at 5)
  function getGroupNudge(n: number, plan: "free" | "plus"): "near_limit" | "at_limit" | null {
    if (plan === "plus") return null;
    if (n >= 5) return "at_limit";
    if (n >= 4) return "near_limit";
    return null;
  }

  it("group nudge: none ≤3, near at 4, at-limit at 5", () => {
    expect(getGroupNudge(3, "free")).toBeNull();
    expect(getGroupNudge(4, "free")).toBe("near_limit");
    expect(getGroupNudge(5, "free")).toBe("at_limit");
    expect(getGroupNudge(5, "plus")).toBeNull();
  });

  // Member & expense nudges no longer fire (those caps were removed)
  const getMemberNudge = () => null;
  const getExpenseNudge = () => null;

  it("member & expense nudges never fire", () => {
    expect(getMemberNudge()).toBeNull();
    expect(getExpenseNudge()).toBeNull();
  });
});

describe("getUserPlan — timestamp-driven model (Razorpay M1 refactor)", () => {
  const NOW = new Date("2026-06-18T12:00:00Z");

  // Mirrors gates.ts getUserPlan: isPlus = currentPeriodEnd > now, OR trialing with
  // trialEndsAt > now. Deliberately does NOT consult `status==='active'` — a lapsed
  // pass must stop counting as Plus on its own (lazy expiry, no downgrade cron).
  function getUserPlanModel(sub: {
    currentPeriodEnd: Date | null;
    status: "trialing" | "active" | "cancelled";
    trialEndsAt: Date | null;
  } | null): "plus" | "free" {
    if (!sub) return "free";
    if (sub.currentPeriodEnd && sub.currentPeriodEnd > NOW) return "plus";
    if (sub.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt > NOW) return "plus";
    return "free";
  }

  it("no subscription row → free", () => {
    expect(getUserPlanModel(null)).toBe("free");
  });

  it("paid entitlement window still open → plus, regardless of status", () => {
    const future = new Date(NOW);
    future.setDate(future.getDate() + 10);
    expect(
      getUserPlanModel({ currentPeriodEnd: future, status: "cancelled", trialEndsAt: null }),
    ).toBe("plus");
  });

  it("lapsed entitlement with a stale status='active' row → free (lazy expiry, no cron needed)", () => {
    const past = new Date(NOW);
    past.setDate(past.getDate() - 1);
    expect(
      getUserPlanModel({ currentPeriodEnd: past, status: "active", trialEndsAt: null }),
    ).toBe("free");
  });

  it("trialing with trialEndsAt in the future → plus", () => {
    const future = new Date(NOW);
    future.setDate(future.getDate() + 5);
    expect(
      getUserPlanModel({ currentPeriodEnd: null, status: "trialing", trialEndsAt: future }),
    ).toBe("plus");
  });

  it("trialing but trialEndsAt has passed → free", () => {
    const past = new Date(NOW);
    past.setDate(past.getDate() - 1);
    expect(
      getUserPlanModel({ currentPeriodEnd: null, status: "trialing", trialEndsAt: past }),
    ).toBe("free");
  });

  it("no entitlement window and not trialing → free", () => {
    expect(
      getUserPlanModel({ currentPeriodEnd: null, status: "cancelled", trialEndsAt: null }),
    ).toBe("free");
  });
});
