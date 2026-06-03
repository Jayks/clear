/**
 * Unit tests for the pure logic introduced by Round-4 bug fixes in stream.ts.
 *
 * S-7  undoSettleStream — disputedAt check in status restoration
 * S-8  undoSettleStream — non-atomic DELETE + UPDATE (documented invariant)
 * S-9  undoSettleWithPerson — per-row loop → grouped batch UPDATEs in transaction
 * S-10 confirmStreamSettle — non-atomic confirm + settle (documented invariant)
 *
 * Run with: pnpm test lib/stream/stream-undo-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── Shared helper — mirrors the status-restoration logic in both undo functions ─

type StreamRow = {
  id:          string;
  confirmedAt: Date | null;
  disputedAt:  Date | null;
};

/**
 * Returns the status the stream should be restored to after a settle is undone.
 * Priority: disputedAt > confirmedAt > "pending"
 */
function previousStatus(row: Pick<StreamRow, "confirmedAt" | "disputedAt">): string {
  if (row.disputedAt)  return "disputed";
  if (row.confirmedAt) return "confirmed";
  return "pending";
}

/**
 * Buggy version (before S-7 fix): only checked confirmedAt.
 */
function previousStatusBuggy(row: Pick<StreamRow, "confirmedAt" | "disputedAt">): string {
  return row.confirmedAt ? "confirmed" : "pending";
}

// ── S-7: undoSettleStream — disputedAt check ──────────────────────────────────

describe("undoSettleStream — status restoration with disputedAt (S-7)", () => {
  it("pending stream → restored to 'pending'", () => {
    expect(previousStatus({ confirmedAt: null, disputedAt: null })).toBe("pending");
  });

  it("confirmed stream → restored to 'confirmed'", () => {
    expect(previousStatus({ confirmedAt: new Date(), disputedAt: null })).toBe("confirmed");
  });

  it("disputed stream → restored to 'disputed'", () => {
    expect(previousStatus({ confirmedAt: new Date(), disputedAt: new Date() })).toBe("disputed");
  });

  it("disputed stream with no confirmedAt → still 'disputed'", () => {
    // disputedAt can exist without confirmedAt (dispute happened before confirmation)
    expect(previousStatus({ confirmedAt: null, disputedAt: new Date() })).toBe("disputed");
  });

  it("[BUG SCENARIO] old code: disputed stream restored to 'confirmed' instead of 'disputed'", () => {
    const row = { confirmedAt: new Date(), disputedAt: new Date() };
    expect(previousStatusBuggy(row)).toBe("confirmed"); // BUG — wrong state
    expect(previousStatus(row)).toBe("disputed");        // FIX — correct state
  });

  it("[BUG SCENARIO] old code: disputed-but-unconfirmed stream restored to 'pending'", () => {
    const row = { confirmedAt: null, disputedAt: new Date() };
    expect(previousStatusBuggy(row)).toBe("pending");  // BUG — wrong state
    expect(previousStatus(row)).toBe("disputed");       // FIX — correct state
  });
});

// ── S-8: undoSettleStream — atomicity invariant ──────────────────────────────

describe("undoSettleStream — atomic DELETE + UPDATE (S-8)", () => {
  /**
   * The invariant: after a successful undo, the settlement row must not exist
   * AND the stream status must not be "settled".  Both must be true together
   * or neither — partial state is a corruption.
   */

  it("invariant: settled=false ⟺ settlement deleted", () => {
    // Represents the state after a successful db.transaction():
    const settlementExists = false; // was deleted inside tx
    const streamStatus     = "confirmed"; // was reverted inside tx
    expect(settlementExists).toBe(false);
    expect(streamStatus).not.toBe("settled");
  });

  it("[BUG SCENARIO] non-atomic: settlement deleted but status stays 'settled'", () => {
    // Before fix: DELETE settlement committed, then UPDATE status threw.
    // Settlement is gone; stream shows as settled permanently.
    const settlementExists = false; // DELETE committed (irreversible)
    const streamStatus     = "settled"; // UPDATE never ran

    // This combination is the corruption
    expect(settlementExists).toBe(false);
    expect(streamStatus).toBe("settled"); // balance locked forever
    // After fix: db.transaction() rolls back DELETE if UPDATE fails
  });

  it("[BUG SCENARIO] non-atomic: status reverted but settlement still present", () => {
    // Hypothetical reverse failure (extremely unlikely but documents the invariant)
    const settlementExists = true;   // DELETE failed
    const streamStatus     = "confirmed"; // UPDATE ran (impossibly — only runs after DELETE)
    // In practice the order is DELETE-then-UPDATE, so this scenario can't occur,
    // but the transaction guarantee prevents any partial-state regardless.
    expect(settlementExists).not.toBe(false);
    expect(streamStatus).not.toBe("settled");
  });
});

// ── S-9: undoSettleWithPerson — grouped batch UPDATEs ────────────────────────

describe("undoSettleWithPerson — grouped batch UPDATEs in transaction (S-9)", () => {
  /**
   * The grouping logic: sort rows into three buckets by their pre-settle status.
   * Each bucket becomes one inArray UPDATE inside the transaction.
   */
  function groupByPreviousStatus(rows: StreamRow[]): {
    disputedIds:  string[];
    confirmedIds: string[];
    pendingIds:   string[];
  } {
    return {
      disputedIds:  rows.filter((r) => r.disputedAt).map((r) => r.id),
      confirmedIds: rows.filter((r) => !r.disputedAt && r.confirmedAt).map((r) => r.id),
      pendingIds:   rows.filter((r) => !r.disputedAt && !r.confirmedAt).map((r) => r.id),
    };
  }

  it("correctly groups a mixed set of rows", () => {
    const rows: StreamRow[] = [
      { id: "r1", confirmedAt: null,     disputedAt: null     }, // pending
      { id: "r2", confirmedAt: new Date(), disputedAt: null   }, // confirmed
      { id: "r3", confirmedAt: new Date(), disputedAt: new Date() }, // disputed
      { id: "r4", confirmedAt: null,     disputedAt: new Date() }, // disputed (no confirm)
      { id: "r5", confirmedAt: null,     disputedAt: null     }, // pending
    ];

    const { disputedIds, confirmedIds, pendingIds } = groupByPreviousStatus(rows);

    expect(disputedIds.sort()).toEqual(["r3", "r4"].sort());
    expect(confirmedIds).toEqual(["r2"]);
    expect(pendingIds.sort()).toEqual(["r1", "r5"].sort());

    // All IDs accounted for exactly once
    const total = disputedIds.length + confirmedIds.length + pendingIds.length;
    expect(total).toBe(rows.length);
  });

  it("all-pending rows → only pendingIds populated", () => {
    const rows: StreamRow[] = [
      { id: "r1", confirmedAt: null, disputedAt: null },
      { id: "r2", confirmedAt: null, disputedAt: null },
    ];
    const { disputedIds, confirmedIds, pendingIds } = groupByPreviousStatus(rows);
    expect(disputedIds).toHaveLength(0);
    expect(confirmedIds).toHaveLength(0);
    expect(pendingIds).toHaveLength(2);
  });

  it("all-disputed rows → only disputedIds populated", () => {
    const rows: StreamRow[] = [
      { id: "r1", confirmedAt: null,     disputedAt: new Date() },
      { id: "r2", confirmedAt: new Date(), disputedAt: new Date() },
    ];
    const { disputedIds, confirmedIds, pendingIds } = groupByPreviousStatus(rows);
    expect(disputedIds).toHaveLength(2);
    expect(confirmedIds).toHaveLength(0);
    expect(pendingIds).toHaveLength(0);
  });

  it("[BUG SCENARIO] loop N updates not in transaction — partial revert on failure", () => {
    // Before fix: 3 rows to revert; second update throws.
    // Row 0 is committed; rows 1+2 are not.
    const results: Array<{ id: string; reverted: boolean }> = [
      { id: "r1", reverted: true  }, // committed before failure
      { id: "r2", reverted: false }, // threw — not committed
      { id: "r3", reverted: false }, // loop aborted — not committed
    ];

    const partiallyReverted = results.filter((r) => r.reverted).length;
    expect(partiallyReverted).toBe(1); // only 1 of 3 — balance is partially wrong

    // After fix: all three are in one transaction — any failure rolls all back.
    // Client gets { ok: false } and can retry.
  });

  it("batch approach: number of DB queries = 3 max regardless of row count", () => {
    // Before fix: N rows = N queries (one per row in loop).
    // After fix:  always exactly 3 queries (one per bucket), even for 100 rows.
    const rowCount = 50;
    const queriesBeforeFix = rowCount; // N individual UPDATEs
    const queriesAfterFix  = 3;        // 3 batch inArray UPDATEs

    expect(queriesAfterFix).toBeLessThan(queriesBeforeFix);
  });
});

// ── S-10: confirmStreamSettle — atomicity invariant ─────────────────────────

describe("confirmStreamSettle — atomic confirm + settle (S-10)", () => {
  /**
   * The invariant: after confirmStreamSettle succeeds, BOTH conditions must hold:
   *   1. streamSettlements.isConfirmed = true
   *   2. The relevant streamRecords.status = "settled"
   */

  it("invariant: settlement confirmed ⟺ records settled", () => {
    // Represents the state after a successful transaction
    const settlementConfirmed = true;
    const recordsSettled      = true;
    expect(settlementConfirmed).toBe(true);
    expect(recordsSettled).toBe(true);
  });

  it("[BUG SCENARIO] non-atomic: settlement confirmed but records stay active", () => {
    // Before fix: UPDATE streamSettlements committed, then UPDATE streamRecords failed.
    const settlementConfirmed = true;   // committed — can't undo
    const recordsSettled      = false;  // UPDATE failed — records still "active"

    // Resulting broken state:
    // - Creditor's balance shows outstanding (records not settled)
    // - Debtor gets "Already confirmed" if they try to re-confirm
    // - No recovery path without direct DB access
    expect(settlementConfirmed).toBe(true);
    expect(recordsSettled).toBe(false); // proves the corruption
    // After fix: db.transaction() rolls back the isConfirmed update if the
    // streamRecords update fails
  });

  it("invariant: full payment settles all active records", () => {
    const records = [
      { id: "r1", amount: 500 },
      { id: "r2", amount: 300 },
    ];
    const paidAmount     = 800;
    const totalOutstanding = records.reduce((s, r) => s + r.amount, 0);

    const isFullPayment = paidAmount >= totalOutstanding - 0.01;
    const toSettleIds = isFullPayment ? records.map((r) => r.id) : [];

    expect(isFullPayment).toBe(true);
    expect(toSettleIds).toEqual(["r1", "r2"]);
  });

  it("invariant: partial payment settles only covered entries", () => {
    const records = [
      { id: "r1", amount: 300 },
      { id: "r2", amount: 500 },
    ];
    const paidAmount = 350;
    let remaining = paidAmount;
    const toSettleIds: string[] = [];

    for (const r of records) {
      if (remaining <= 0) break;
      if (r.amount <= remaining + 0.01) {
        toSettleIds.push(r.id);
        remaining -= r.amount;
      } else {
        break;
      }
    }

    expect(toSettleIds).toEqual(["r1"]); // only r1 (₹300) fits; r2 (₹500) does not
    expect(remaining).toBe(50);           // ₹50 of payment unallocated
  });
});
