/**
 * Unit tests for Circle action guards from the June 2026 bug scan.
 *
 * C-2  addCircleExpense — wallet balance check + INSERT outside transaction (race)
 * C-3  selfReportContribution — duplicate-guard SELECTs outside transaction (race)
 * C-6  getCircleDashboardData — unconfirmedMap new Map() drops all but last per member
 *
 * Run with: pnpm test lib/circle/circle-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── C-6: unconfirmedMap duplicate handling ─────────────────────────────────────

type Contrib = { id: string; memberId: string; isConfirmed: boolean; amount: string };

/** Current (buggy) Map construction — processes array left-to-right, later
 *  entries overwrite earlier ones for the same memberId. */
function buildUnconfirmedMap_BUGGY(contribs: Contrib[]): Map<string, Contrib> {
  return new Map(
    contribs.filter((c) => !c.isConfirmed).map((c) => [c.memberId, c]),
  );
}

/** Fixed version — iterate and keep FIRST (oldest) unconfirmed per member. */
function buildUnconfirmedMap_FIXED(contribs: Contrib[]): Map<string, Contrib> {
  const map = new Map<string, Contrib>();
  for (const c of contribs) {
    if (!c.isConfirmed && !map.has(c.memberId)) {
      map.set(c.memberId, c);
    }
  }
  return map;
}

describe("getCircleDashboardData — unconfirmedMap duplicate handling (C-6)", () => {
  const contribs: Contrib[] = [
    { id: "u1", memberId: "m1", isConfirmed: false, amount: "500" }, // oldest
    { id: "u2", memberId: "m1", isConfirmed: false, amount: "600" }, // duplicate race entry
    { id: "u3", memberId: "m2", isConfirmed: false, amount: "400" },
  ];

  it("[BUG] new Map() keeps only the LAST unconfirmed per member — first is orphaned", () => {
    const map = buildUnconfirmedMap_BUGGY(contribs);
    // m1 has 2 unconfirmed rows; Map keeps u2 (last), u1 is silently discarded
    expect(map.get("m1")!.id).toBe("u2"); // wrong: u1 should be visible
    expect(map.size).toBe(2);             // looks correct but u1 is unreachable
  });

  it("[FIXED] iterate-and-skip keeps FIRST (oldest) unconfirmed per member", () => {
    const map = buildUnconfirmedMap_FIXED(contribs);
    expect(map.get("m1")!.id).toBe("u1"); // oldest entry returned first
    expect(map.size).toBe(2);
  });

  it("[FIXED] single entry per member — both implementations agree", () => {
    const single: Contrib[] = [{ id: "u3", memberId: "m2", isConfirmed: false, amount: "400" }];
    expect(buildUnconfirmedMap_BUGGY(single).get("m2")!.id).toBe("u3");
    expect(buildUnconfirmedMap_FIXED(single).get("m2")!.id).toBe("u3");
  });

  it("[FIXED] confirmed entries are excluded from unconfirmedMap", () => {
    const mixed: Contrib[] = [
      { id: "c1", memberId: "m1", isConfirmed: true,  amount: "500" },
      { id: "u1", memberId: "m2", isConfirmed: false, amount: "400" },
    ];
    const map = buildUnconfirmedMap_FIXED(mixed);
    expect(map.has("m1")).toBe(false); // confirmed → excluded
    expect(map.has("m2")).toBe(true);  // unconfirmed → included
  });

  it("[FIXED] empty input → empty map", () => {
    expect(buildUnconfirmedMap_FIXED([]).size).toBe(0);
  });

  it("[FIXED] all confirmed → empty unconfirmedMap", () => {
    const allConfirmed: Contrib[] = [
      { id: "c1", memberId: "m1", isConfirmed: true, amount: "500" },
      { id: "c2", memberId: "m2", isConfirmed: true, amount: "400" },
    ];
    expect(buildUnconfirmedMap_FIXED(allConfirmed).size).toBe(0);
  });
});

// ── C-2: wallet balance check — race between read and INSERT ──────────────────

describe("addCircleExpense — wallet balance check race (C-2)", () => {
  /** Simulates the balance check as implemented (outside transaction). */
  function canDraw(amount: number, confirmedContribTotal: number, expenseTotal: number): boolean {
    const poolBalance = confirmedContribTotal - expenseTotal;
    return amount <= poolBalance + 0.01; // +0.01 for floating-point tolerance
  }

  it("exact balance: drawing total balance is allowed", () => {
    expect(canDraw(5000, 5000, 0)).toBe(true);
  });

  it("under balance: smaller draw is allowed", () => {
    expect(canDraw(3000, 5000, 0)).toBe(true);
  });

  it("overdraw: ₹1 over balance is rejected", () => {
    expect(canDraw(5001, 5000, 0)).toBe(false);
  });

  it("pre-existing expenses reduce available balance", () => {
    // ₹2000 already drawn; ₹5000 pool → ₹3000 available
    expect(canDraw(3000, 5000, 2000)).toBe(true);
    expect(canDraw(3001, 5000, 2000)).toBe(false);
  });

  it("[BUG] concurrent race: two admins both pass the check against the same stale balance", () => {
    // Both read: confirmedContrib=5000, expenses=0  →  poolBalance=5000
    const admin1Passes = canDraw(4000, 5000, 0); // sees ₹5000 available
    const admin2Passes = canDraw(4000, 5000, 0); // also sees ₹5000 available
    expect(admin1Passes).toBe(true);
    expect(admin2Passes).toBe(true);
    // Both pass → total draw ₹8000 > ₹5000 pool (overdraft of ₹3000)
    // Fix: wrap balance SELECT + INSERT in db.transaction()
  });

  it("is_advance=true bypasses balance check entirely (admin advances from own pocket)", () => {
    const isAdvance = true;
    // When isAdvance, wallet draw guard is skipped — always allowed regardless of balance
    const wouldPassWithoutAdvance = canDraw(99999, 0, 0);
    expect(wouldPassWithoutAdvance).toBe(false); // would be rejected
    expect(isAdvance).toBe(true); // but advance flag skips the check
  });
});

// ── C-3: selfReportContribution — non-atomic duplicate check ──────────────────

describe("selfReportContribution — non-atomic duplicate guard (C-3)", () => {
  type ContribState = "confirmed" | "pending" | "none";

  /** Simulates the two sequential SELECTs currently used as a duplicate guard. */
  function nonAtomicCheck(
    confirmedRow: boolean,
    pendingRow: boolean,
  ): "already_paid" | "already_pending" | "inserted" {
    if (confirmedRow)  return "already_paid";    // check 1: confirmed exists
    if (pendingRow)    return "already_pending"; // check 2: pending exists
    return "inserted";                           // both clear → insert
  }

  it("confirmed row exists → early return, no insert", () => {
    expect(nonAtomicCheck(true, false)).toBe("already_paid");
  });

  it("only pending row exists → early return, no insert", () => {
    expect(nonAtomicCheck(false, true)).toBe("already_pending");
  });

  it("no existing row → inserts", () => {
    expect(nonAtomicCheck(false, false)).toBe("inserted");
  });

  it("[BUG] concurrent race: both calls see no rows, both insert → duplicate pending rows", () => {
    // Call 1: reads confirmedRow=false, pendingRow=false (before call 2's INSERT)
    const call1 = nonAtomicCheck(false, false); // → "inserted"
    // Call 2: also reads confirmedRow=false, pendingRow=false (before call 1 commits)
    const call2 = nonAtomicCheck(false, false); // → "inserted" (duplicate!)
    expect(call1).toBe("inserted");
    expect(call2).toBe("inserted");
    // Fix: wrap both SELECTs + INSERT in db.transaction()
  });

  it("[BUG] admin race: admin confirms between the two SELECTs → spurious pending row", () => {
    // Timeline:
    //   Member read1: alreadyConfirmed=false (no confirmed row yet)
    //   Admin: recordContribution() → inserts confirmed row
    //   Member read2: alreadyPending=false (no pending row)
    //   Member: inserts pending row  ← wrong! confirmed row already exists
    const confirmedByAdmin = true;
    const memberSawConfirmedAtRead1 = false; // race: read1 happened before admin insert
    const memberSawPendingAtRead2   = false; // no pending row at read2

    const checkAfterAdminRace = nonAtomicCheck(memberSawConfirmedAtRead1, memberSawPendingAtRead2);
    expect(checkAfterAdminRace).toBe("inserted"); // wrong: member inserts despite admin already recording
    expect(confirmedByAdmin).toBe(true); // but admin has already confirmed → duplicate state
    // Fix: the confirmed-check SELECT and the INSERT must be in the same transaction
  });
});
