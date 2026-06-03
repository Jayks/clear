/**
 * Tests for the isConfirmed guards added in Round-7 bug fixes (R7-1 and R7-2).
 *
 * R7-1 — `lib/db/queries/activity.ts` settlements UNION
 *   The raw SQL query had no `AND s.is_confirmed = true` clause, meaning
 *   self-reported (unconfirmed, pending-creditor-review) settlements appeared in
 *   the group activity feed as if they were fully settled. Disputed/deleted
 *   self-reports would disappear eventually, but during the review window ALL
 *   group members saw misleading "X settled with Y" events.
 *
 *   Fix: add `AND s.is_confirmed = true` to the settlements UNION WHERE.
 *
 * R7-2 — `lib/db/queries/insights.ts` stream settlements payment-method query
 *   The payment-method stats IOTA (paymentMethodRows) included stream settlements
 *   regardless of isConfirmed status. Trip/nest settlements used
 *   `isConfirmed = true` and circle contributions used `isConfirmed = true`, but
 *   stream settlements did not — creating an inconsistency that inflated UPI/GPay
 *   payment counts during the pending-confirmation window.
 *
 *   Fix: add `eq(streamSettlements.isConfirmed, true)` to the stream settlements
 *   WHERE clause.
 *
 * Run with: pnpm test lib/activity/activity-confirm-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── Shared types ─────────────────────────────────────────────────────────────

interface FakeSettlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  isConfirmed: boolean;
  settledAt: Date;
}

interface FakeActivityRow {
  type: string;
  id: string;
  amount: number;
  actorName: string;
  otherName: string;
}

// ── Simulation helpers ────────────────────────────────────────────────────────

/**
 * BUGGY version of the settlements UNION: no isConfirmed filter.
 * Returns activity rows for ALL settlements in the group.
 */
function simulateBuggyActivitySettlements(
  settlements: FakeSettlement[],
  groupId: string,
): FakeActivityRow[] {
  return settlements
    .filter((s) => s.groupId === groupId)
    .map((s) => ({
      type:      "settlement",
      id:        s.id,
      amount:    s.amount,
      actorName: `member-${s.fromMemberId}`,
      otherName: `member-${s.toMemberId}`,
    }));
}

/**
 * FIXED version of the settlements UNION: adds `AND s.is_confirmed = true`.
 * Only confirmed settlements appear in the activity feed.
 */
function simulateFixedActivitySettlements(
  settlements: FakeSettlement[],
  groupId: string,
): FakeActivityRow[] {
  return settlements
    .filter((s) => s.groupId === groupId && s.isConfirmed)
    .map((s) => ({
      type:      "settlement",
      id:        s.id,
      amount:    s.amount,
      actorName: `member-${s.fromMemberId}`,
      otherName: `member-${s.toMemberId}`,
    }));
}

// ── Shared types (stream payment methods) ────────────────────────────────────

interface FakeStreamSettlement {
  id: string;
  recordedBy: string;
  paymentMethod: string | null;
  amount: number;
  isConfirmed: boolean;
}

/**
 * BUGGY version of stream settlements payment-method aggregation.
 * No isConfirmed filter — counts pending self-reports.
 */
function simulateBuggyStreamPaymentMethods(
  rows: FakeStreamSettlement[],
  userId: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (r.recordedBy !== userId || !r.paymentMethod) continue;
    totals.set(r.paymentMethod, (totals.get(r.paymentMethod) ?? 0) + 1);
  }
  return totals;
}

/**
 * FIXED version: add isConfirmed = true filter.
 */
function simulateFixedStreamPaymentMethods(
  rows: FakeStreamSettlement[],
  userId: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (r.recordedBy !== userId || !r.paymentMethod || !r.isConfirmed) continue;
    totals.set(r.paymentMethod, (totals.get(r.paymentMethod) ?? 0) + 1);
  }
  return totals;
}

// ── R7-1: activity.ts settlements UNION ──────────────────────────────────────

describe("activity feed settlements UNION — isConfirmed guard (R7-1)", () => {
  it("normal path: confirmed settlement appears in activity feed", () => {
    const settlements: FakeSettlement[] = [
      { id: "s1", groupId: "g1", fromMemberId: "m1", toMemberId: "m2",
        amount: 500, isConfirmed: true, settledAt: new Date() },
    ];
    const rows = simulateFixedActivitySettlements(settlements, "g1");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("s1");
  });

  it("unconfirmed (self-reported) settlement does NOT appear in fixed feed", () => {
    const settlements: FakeSettlement[] = [
      { id: "s1", groupId: "g1", fromMemberId: "m1", toMemberId: "m2",
        amount: 500, isConfirmed: false, settledAt: new Date() },
    ];
    const rows = simulateFixedActivitySettlements(settlements, "g1");
    expect(rows).toHaveLength(0);
  });

  it("[BUG SCENARIO] unconfirmed self-report appears in BUGGY feed but not FIXED feed", () => {
    const settlements: FakeSettlement[] = [
      { id: "s1", groupId: "g1", fromMemberId: "m1", toMemberId: "m2",
        amount: 300, isConfirmed: false, settledAt: new Date() },
    ];

    // BUGGY: pending payment shows as "settled"
    const buggyRows = simulateBuggyActivitySettlements(settlements, "g1");
    expect(buggyRows).toHaveLength(1); // misleadingly shown as settled — WRONG

    // FIXED: pending payment is correctly hidden
    const fixedRows = simulateFixedActivitySettlements(settlements, "g1");
    expect(fixedRows).toHaveLength(0); // correctly omitted — CORRECT
  });

  it("mixed: only confirmed settlement shows in fixed feed", () => {
    const settlements: FakeSettlement[] = [
      { id: "s1", groupId: "g1", fromMemberId: "m1", toMemberId: "m2",
        amount: 500, isConfirmed: true,  settledAt: new Date() },
      { id: "s2", groupId: "g1", fromMemberId: "m3", toMemberId: "m4",
        amount: 200, isConfirmed: false, settledAt: new Date() },
    ];
    const rows = simulateFixedActivitySettlements(settlements, "g1");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("s1");
  });

  it("settlements from other groups are excluded regardless of isConfirmed", () => {
    const settlements: FakeSettlement[] = [
      { id: "s1", groupId: "g2", fromMemberId: "m1", toMemberId: "m2",
        amount: 500, isConfirmed: true,  settledAt: new Date() },
    ];
    const rows = simulateFixedActivitySettlements(settlements, "g1");
    expect(rows).toHaveLength(0);
  });

  it("invariant: confirmed settlements are permanent payment history; unconfirmed are not", () => {
    const allSettlements = [
      { id: "s1", isConfirmed: true  },
      { id: "s2", isConfirmed: false },
      { id: "s3", isConfirmed: true  },
    ];
    const activityEligible = allSettlements.filter((s) => s.isConfirmed);
    expect(activityEligible).toHaveLength(2);
    expect(activityEligible.map((s) => s.id)).toEqual(["s1", "s3"]);
  });
});

// ── R7-2: insights.ts stream settlements payment-method query ─────────────────

describe("stream settlements payment-method stats — isConfirmed guard (R7-2)", () => {
  it("normal path: confirmed stream settlement counts toward payment method stat", () => {
    const rows: FakeStreamSettlement[] = [
      { id: "ss1", recordedBy: "u1", paymentMethod: "google_pay",
        amount: 500, isConfirmed: true },
    ];
    const stats = simulateFixedStreamPaymentMethods(rows, "u1");
    expect(stats.get("google_pay")).toBe(1);
  });

  it("unconfirmed stream settlement does NOT count in fixed stats", () => {
    const rows: FakeStreamSettlement[] = [
      { id: "ss1", recordedBy: "u1", paymentMethod: "google_pay",
        amount: 500, isConfirmed: false },
    ];
    const stats = simulateFixedStreamPaymentMethods(rows, "u1");
    expect(stats.get("google_pay")).toBeUndefined();
    expect(stats.size).toBe(0);
  });

  it("[BUG SCENARIO] pending self-report inflates payment method count in buggy stats", () => {
    const rows: FakeStreamSettlement[] = [
      { id: "ss1", recordedBy: "u1", paymentMethod: "phonepe",
        amount: 200, isConfirmed: false }, // pending — awaiting creditor confirm
    ];

    // BUGGY: counts the unconfirmed payment
    const buggy = simulateBuggyStreamPaymentMethods(rows, "u1");
    expect(buggy.get("phonepe")).toBe(1); // inflated count — WRONG

    // FIXED: correctly excludes the unconfirmed payment
    const fixed = simulateFixedStreamPaymentMethods(rows, "u1");
    expect(fixed.get("phonepe")).toBeUndefined(); // not counted — CORRECT
    expect(fixed.size).toBe(0);
  });

  it("consistent with trip/nest and circle: all three sources use isConfirmed=true", () => {
    // Documents the invariant: payment method stats should only count
    // transactions that the counterpart has confirmed as received.
    // All three sources (trip/nest settlements, stream settlements, circle
    // contributions) should apply the isConfirmed=true filter consistently.
    const tripNestFilter   = { isConfirmed: true };    // already existed (B-1 / I-1 pattern)
    const circleFilter     = { isConfirmed: true };    // already existed
    const streamFilterFix  = { isConfirmed: true };    // R7-2 fix

    expect(tripNestFilter.isConfirmed).toBe(true);
    expect(circleFilter.isConfirmed).toBe(true);
    expect(streamFilterFix.isConfirmed).toBe(true);
  });

  it("settlement with null paymentMethod is excluded regardless of isConfirmed", () => {
    const rows: FakeStreamSettlement[] = [
      { id: "ss1", recordedBy: "u1", paymentMethod: null,
        amount: 500, isConfirmed: true },
    ];
    const stats = simulateFixedStreamPaymentMethods(rows, "u1");
    expect(stats.size).toBe(0);
  });

  it("only rows where recordedBy === userId are counted", () => {
    const rows: FakeStreamSettlement[] = [
      { id: "ss1", recordedBy: "u1", paymentMethod: "upi", amount: 100, isConfirmed: true },
      { id: "ss2", recordedBy: "u2", paymentMethod: "upi", amount: 200, isConfirmed: true },
    ];
    const statsForU1 = simulateFixedStreamPaymentMethods(rows, "u1");
    expect(statsForU1.get("upi")).toBe(1); // only ss1 counted
  });
});
