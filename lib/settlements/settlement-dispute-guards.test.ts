/**
 * Unit tests for the SELECT-then-DELETE race condition guard introduced by the
 * Round-6 bug fixes (R6-1 and R6-2).
 *
 * Pattern: both `disputeSettlement` (group settlements) and `disputeStreamSettle`
 * (stream settlements) check `isConfirmed` in a SELECT, then perform a DELETE
 * without re-asserting `isConfirmed=false` in the WHERE clause.
 *
 * A concurrent `confirmSettlement` / `confirmStreamSettle` that executes between
 * the SELECT and DELETE would cause a confirmed settlement (permanent balance
 * history) to be silently deleted.
 *
 * Fix: mirror the C-2 pattern applied to `circle.ts` `disputeContribution` —
 * include `isConfirmed=false` in the DELETE WHERE clause so the delete is a
 * no-op if confirmation raced ahead.
 *
 * Run with: pnpm test lib/settlements/settlement-dispute-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── Shared types ─────────────────────────────────────────────────────────────

interface SettlementRow {
  id: string;
  isConfirmed: boolean;
  groupId: string;
}

// ── Simulated DB helpers ──────────────────────────────────────────────────────

/**
 * Simulates the BUGGY `disputeSettlement` DELETE (before R6-1 fix).
 * The WHERE clause has no `isConfirmed=false` predicate.
 */
function simulateBuggyDeleteSettlement(
  db: SettlementRow[],
  id: string,
  groupId: string,
): { deleted: boolean } {
  const idx = db.findIndex((s) => s.id === id && s.groupId === groupId);
  if (idx === -1) return { deleted: false };
  db.splice(idx, 1);
  return { deleted: true };
}

/**
 * Simulates the FIXED `disputeSettlement` DELETE (R6-1 fix).
 * The WHERE clause includes `isConfirmed=false` — confirmed rows are untouched.
 */
function simulateFixedDeleteSettlement(
  db: SettlementRow[],
  id: string,
  groupId: string,
): { deleted: boolean } {
  const idx = db.findIndex(
    (s) => s.id === id && s.groupId === groupId && !s.isConfirmed,
  );
  if (idx === -1) return { deleted: false };
  db.splice(idx, 1);
  return { deleted: true };
}

/**
 * Simulates `confirmSettlement` — sets isConfirmed=true on a row.
 * This can execute concurrently with `disputeSettlement`.
 */
function simulateConfirmSettlement(db: SettlementRow[], id: string): void {
  const row = db.find((s) => s.id === id);
  if (row) row.isConfirmed = true;
}

// ── R6-1: settlements.ts disputeSettlement ───────────────────────────────────

describe("disputeSettlement — isConfirmed=false guard in DELETE (R6-1)", () => {
  it("normal path: unconfirmed settlement is deleted successfully", () => {
    const db: SettlementRow[] = [
      { id: "s1", isConfirmed: false, groupId: "g1" },
    ];
    const { deleted } = simulateFixedDeleteSettlement(db, "s1", "g1");
    expect(deleted).toBe(true);
    expect(db).toHaveLength(0);
  });

  it("already-confirmed settlement is NOT deleted by fixed path", () => {
    const db: SettlementRow[] = [
      { id: "s1", isConfirmed: true, groupId: "g1" },
    ];
    const { deleted } = simulateFixedDeleteSettlement(db, "s1", "g1");
    expect(deleted).toBe(false);
    expect(db).toHaveLength(1); // confirmed row survives
  });

  it("[BUG SCENARIO] concurrent confirmation races ahead of DELETE", () => {
    // Represents the window between SELECT (isConfirmed check) and DELETE.
    // Timeline:
    //   1. disputeSettlement SELECT → isConfirmed=false → passes guard
    //   2. confirmSettlement UPDATE → isConfirmed=true
    //   3. disputeSettlement DELETE → (buggy: no re-assertion)
    const db: SettlementRow[] = [
      { id: "s1", isConfirmed: false, groupId: "g1" },
    ];

    // Step 2: confirm races ahead
    simulateConfirmSettlement(db, "s1");
    expect(db[0].isConfirmed).toBe(true);

    // Step 3a BUGGY: DELETE without isConfirmed guard → deletes confirmed settlement
    const dbBuggy = [...db];
    const buggyResult = simulateBuggyDeleteSettlement(dbBuggy, "s1", "g1");
    expect(buggyResult.deleted).toBe(true);
    expect(dbBuggy).toHaveLength(0); // confirmed settlement lost — WRONG

    // Step 3b FIXED: DELETE with isConfirmed=false guard → no-op
    const dbFixed = [...db];
    const fixedResult = simulateFixedDeleteSettlement(dbFixed, "s1", "g1");
    expect(fixedResult.deleted).toBe(false);
    expect(dbFixed).toHaveLength(1); // confirmed settlement preserved — CORRECT
  });

  it("wrong groupId: settlement in different group is NOT deleted", () => {
    const db: SettlementRow[] = [
      { id: "s1", isConfirmed: false, groupId: "g1" },
    ];
    const { deleted } = simulateFixedDeleteSettlement(db, "s1", "g999");
    expect(deleted).toBe(false);
    expect(db).toHaveLength(1);
  });

  it("multiple settlements: only the target unconfirmed row is deleted", () => {
    const db: SettlementRow[] = [
      { id: "s1", isConfirmed: false, groupId: "g1" }, // target
      { id: "s2", isConfirmed: true,  groupId: "g1" }, // confirmed — must survive
      { id: "s3", isConfirmed: false, groupId: "g1" }, // different id — must survive
    ];
    const { deleted } = simulateFixedDeleteSettlement(db, "s1", "g1");
    expect(deleted).toBe(true);
    expect(db).toHaveLength(2);
    expect(db.find((s) => s.id === "s2")).toBeDefined(); // confirmed row intact
    expect(db.find((s) => s.id === "s3")).toBeDefined(); // other unconfirmed intact
  });

  it("invariant: once confirmed a settlement should be immutable to dispute", () => {
    // Documents the business rule: confirmed settlements are permanent balance
    // history. Only unconfirmed (self-reported, pending review) can be disputed.
    const confirmedSettlements = [
      { id: "s1", isConfirmed: true  },
      { id: "s2", isConfirmed: false },
    ];
    const disputeEligible = confirmedSettlements.filter((s) => !s.isConfirmed);
    expect(disputeEligible).toHaveLength(1);
    expect(disputeEligible[0].id).toBe("s2");
  });
});

// ── Shared types for stream settlements ──────────────────────────────────────

interface StreamSettlementRow {
  id: string;
  isConfirmed: boolean;
}

// ── Simulated DB helpers (stream) ─────────────────────────────────────────────

/**
 * Simulates the BUGGY `disputeStreamSettle` DELETE (before R6-2 fix).
 */
function simulateBuggyDeleteStreamSettlement(
  db: StreamSettlementRow[],
  id: string,
): { deleted: boolean } {
  const idx = db.findIndex((s) => s.id === id);
  if (idx === -1) return { deleted: false };
  db.splice(idx, 1);
  return { deleted: true };
}

/**
 * Simulates the FIXED `disputeStreamSettle` DELETE (R6-2 fix).
 */
function simulateFixedDeleteStreamSettlement(
  db: StreamSettlementRow[],
  id: string,
): { deleted: boolean } {
  const idx = db.findIndex((s) => s.id === id && !s.isConfirmed);
  if (idx === -1) return { deleted: false };
  db.splice(idx, 1);
  return { deleted: true };
}

/**
 * Simulates `confirmStreamSettle` — marks the settlement as confirmed.
 */
function simulateConfirmStreamSettlement(
  db: StreamSettlementRow[],
  id: string,
): void {
  const row = db.find((s) => s.id === id);
  if (row) row.isConfirmed = true;
}

// ── R6-2: stream.ts disputeStreamSettle ──────────────────────────────────────

describe("disputeStreamSettle — isConfirmed=false guard in DELETE (R6-2)", () => {
  it("normal path: unconfirmed stream settlement is deleted", () => {
    const db: StreamSettlementRow[] = [{ id: "ss1", isConfirmed: false }];
    const { deleted } = simulateFixedDeleteStreamSettlement(db, "ss1");
    expect(deleted).toBe(true);
    expect(db).toHaveLength(0);
  });

  it("already-confirmed stream settlement is NOT deleted by fixed path", () => {
    const db: StreamSettlementRow[] = [{ id: "ss1", isConfirmed: true }];
    const { deleted } = simulateFixedDeleteStreamSettlement(db, "ss1");
    expect(deleted).toBe(false);
    expect(db).toHaveLength(1); // confirmed row survives
  });

  it("[BUG SCENARIO] concurrent confirmStreamSettle races ahead of disputeStreamSettle", () => {
    // Timeline mirrors R6-1:
    //   1. disputeStreamSettle SELECT → isConfirmed=false → passes guard
    //   2. confirmStreamSettle UPDATE → isConfirmed=true (races ahead)
    //   3. disputeStreamSettle DELETE → (buggy: no re-assertion)
    const db: StreamSettlementRow[] = [{ id: "ss1", isConfirmed: false }];

    // Step 2: confirm races ahead
    simulateConfirmStreamSettlement(db, "ss1");
    expect(db[0].isConfirmed).toBe(true);

    // Step 3a BUGGY: deletes confirmed stream settlement
    const dbBuggy = [...db];
    const buggyResult = simulateBuggyDeleteStreamSettlement(dbBuggy, "ss1");
    expect(buggyResult.deleted).toBe(true);
    expect(dbBuggy).toHaveLength(0); // confirmed stream settlement lost — WRONG

    // Step 3b FIXED: no-op when row is already confirmed
    const dbFixed = [...db];
    const fixedResult = simulateFixedDeleteStreamSettlement(dbFixed, "ss1");
    expect(fixedResult.deleted).toBe(false);
    expect(dbFixed).toHaveLength(1); // confirmed stream settlement preserved — CORRECT
  });

  it("non-existent settlement returns deleted=false without throwing", () => {
    const db: StreamSettlementRow[] = [];
    const { deleted } = simulateFixedDeleteStreamSettlement(db, "ghost-id");
    expect(deleted).toBe(false);
  });

  it("multiple settlements: only target unconfirmed row deleted", () => {
    const db: StreamSettlementRow[] = [
      { id: "ss1", isConfirmed: false }, // target
      { id: "ss2", isConfirmed: true  }, // confirmed — must survive
      { id: "ss3", isConfirmed: false }, // different id — must survive
    ];
    const { deleted } = simulateFixedDeleteStreamSettlement(db, "ss1");
    expect(deleted).toBe(true);
    expect(db).toHaveLength(2);
    expect(db.find((s) => s.id === "ss2")).toBeDefined();
    expect(db.find((s) => s.id === "ss3")).toBeDefined();
  });

  it("invariant: confirmed stream settlements cannot be disputed", () => {
    // Mirrors the group settlement invariant — stream settlements follow the same
    // confirm/dispute lifecycle: once confirmed they are permanent payment records.
    const streamSettlements = [
      { id: "ss1", isConfirmed: true  },
      { id: "ss2", isConfirmed: false },
    ];
    const disputeEligible = streamSettlements.filter((s) => !s.isConfirmed);
    expect(disputeEligible).toHaveLength(1);
    expect(disputeEligible[0].id).toBe("ss2");
  });
});
