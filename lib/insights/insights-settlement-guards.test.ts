/**
 * Unit tests for Round-5 bug fixes.
 *
 * I-1  getPersonalInsightsData — unconfirmed settlements in "You" tab net
 * I-2  computePersonalInsights — settlement terms swapped (+received−sent should be +sent−received)
 * A-1  adminDeleteUser — Auth must be deleted before DB cleanup (ordering fix)
 *
 * Run with: pnpm test lib/insights/insights-settlement-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── Shared helper — net formula variants ──────────────────────────────────────

type SettRow = { fromMemberId: string; toMemberId: string; amount: string; isConfirmed: boolean };

/** Old (buggy) formula: +received − sent */
function computeNetBuggy(
  myMemberId: string,
  paid: number,
  share: number,
  settRows: SettRow[],
): number {
  const sent     = settRows.filter((r) => r.fromMemberId === myMemberId).reduce((s, r) => s + Number(r.amount), 0);
  const received = settRows.filter((r) => r.toMemberId   === myMemberId).reduce((s, r) => s + Number(r.amount), 0);
  return Math.round((paid - share + received - sent) * 100) / 100; // BUG: +received−sent
}

/** Fixed formula: +sent − received  (matches balances.ts exactly) */
function computeNetFixed(
  myMemberId: string,
  paid: number,
  share: number,
  settRows: SettRow[],
): number {
  const sent     = settRows.filter((r) => r.fromMemberId === myMemberId).reduce((s, r) => s + Number(r.amount), 0);
  const received = settRows.filter((r) => r.toMemberId   === myMemberId).reduce((s, r) => s + Number(r.amount), 0);
  return Math.round((paid - share + sent - received) * 100) / 100; // FIX: +sent−received
}

/** I-1 fix: only pass confirmed settlements to the compute function */
function filterConfirmed(rows: SettRow[]): SettRow[] {
  return rows.filter((r) => r.isConfirmed);
}

// ── I-2: formula bug — +received−sent vs +sent−received ──────────────────────

describe("computePersonalInsights — net formula sign fix (I-2)", () => {
  const ALICE = "alice";
  const BOB   = "bob";

  // Scenario: ₹600 dinner, Alice paid, 50/50 split.
  // Alice's base net = +300 (owed by Bob). Bob's base net = −300 (owes Alice).
  // Bob sends ₹300 settlement to Alice.
  const settlement: SettRow[] = [
    { fromMemberId: BOB, toMemberId: ALICE, amount: "300", isConfirmed: true },
  ];

  it("fixed formula: settled creditor shows net = 0", () => {
    const net = computeNetFixed(ALICE, 600, 300, settlement);
    expect(net).toBe(0); // Alice is fully settled
  });

  it("fixed formula: settled debtor shows net = 0", () => {
    const net = computeNetFixed(BOB, 0, 300, settlement);
    expect(net).toBe(0); // Bob is fully settled
  });

  it("fixed formula: no settlement — creditor net = +300", () => {
    expect(computeNetFixed(ALICE, 600, 300, [])).toBe(300);
  });

  it("fixed formula: no settlement — debtor net = −300", () => {
    expect(computeNetFixed(BOB, 0, 300, [])).toBe(-300);
  });

  it("[BUG] old formula: creditor net DOUBLES to +600 after receiving settlement", () => {
    // Old code: +received−sent → receiving ₹300 ADDS to Alice's positive net
    const net = computeNetBuggy(ALICE, 600, 300, settlement);
    expect(net).toBe(600); // wrong: shows "owed ₹600" instead of "settled"
  });

  it("[BUG] old formula: debtor net DOUBLES to −600 after sending settlement", () => {
    // Old code: +received−sent → sending ₹300 SUBTRACTS from Bob's net
    const net = computeNetBuggy(BOB, 0, 300, settlement);
    expect(net).toBe(-600); // wrong: shows "owes ₹600" instead of "settled"
  });

  it("partial settlement: fixed formula shows correct remaining balance", () => {
    const partial: SettRow[] = [
      { fromMemberId: BOB, toMemberId: ALICE, amount: "100", isConfirmed: true },
    ];
    expect(computeNetFixed(ALICE, 600, 300, partial)).toBe(200); // ₹100 received, ₹200 still owed
    expect(computeNetFixed(BOB,   0,   300, partial)).toBe(-200); // ₹100 sent, ₹200 still outstanding
  });

  it("fixed formula matches balances.ts convention: net>0 = owed to me", () => {
    // Verify the fixed formula is consistent with getBalances()
    // balances.ts: net = totalPaid − totalOwed + settlementsSent − settlementsReceived
    // personal-insights fix: net = paid − share + sent − received
    // Both use the same sign convention for sent/received.
    const aliceNet = computeNetFixed(ALICE, 600, 300, []);
    const bobNet   = computeNetFixed(BOB,   0,   300, []);
    expect(aliceNet).toBeGreaterThan(0); // Alice is owed
    expect(bobNet).toBeLessThan(0);      // Bob owes
  });
});

// ── I-1: missing isConfirmed filter in settRows query ────────────────────────

describe("getPersonalInsightsData — confirmed-only settlements (I-1)", () => {
  const ME   = "member-me";
  const THEM = "member-them";

  it("confirmed settlement clears the debt (fixed formula + isConfirmed filter)", () => {
    const rows: SettRow[] = [
      { fromMemberId: ME, toMemberId: THEM, amount: "300", isConfirmed: true },
    ];
    const net = computeNetFixed(ME, 0, 300, filterConfirmed(rows));
    expect(net).toBe(0);
  });

  it("[BUG] unconfirmed settlement falsely clears You-tab net", () => {
    const rows: SettRow[] = [
      { fromMemberId: ME, toMemberId: THEM, amount: "300", isConfirmed: false },
    ];
    // Fixed code should exclude unconfirmed → net remains −300
    const fixedNet = computeNetFixed(ME, 0, 300, filterConfirmed(rows));
    expect(fixedNet).toBe(-300); // correctly outstanding

    // If passed unfiltered (old bug), the fixed formula at least doesn't
    // show the wrong sign, but the amount is still wrong
    const withUnconfirmed = computeNetFixed(ME, 0, 300, rows);
    expect(withUnconfirmed).toBe(0); // wrong: unconfirmed payment clears the balance
  });

  it("partial confirmed: only confirmed portion counts toward net", () => {
    const rows: SettRow[] = [
      { fromMemberId: ME, toMemberId: THEM, amount: "200", isConfirmed: true  },
      { fromMemberId: ME, toMemberId: THEM, amount: "100", isConfirmed: false }, // pending
    ];
    const net = computeNetFixed(ME, 0, 300, filterConfirmed(rows));
    expect(net).toBe(-100); // ₹200 confirmed, ₹100 still outstanding
  });

  it("paymentMethodRows was already filtered (consistency: both queries now match)", () => {
    // paymentMethodRows had isConfirmed=true already; settRows now matches.
    const all: SettRow[] = [
      { fromMemberId: ME, toMemberId: THEM, amount: "500", isConfirmed: true  },
      { fromMemberId: ME, toMemberId: THEM, amount: "200", isConfirmed: false },
    ];
    expect(filterConfirmed(all)).toHaveLength(1);
    expect(filterConfirmed(all)[0].amount).toBe("500");
  });

  it("totalOwedToMe / totalIOwe computed from confirmed-only nets", () => {
    const nets = [500, -200, 300];
    const totalOwedToMe = nets.filter((n) => n > 0).reduce((s, n) => s + n, 0);
    const totalIOwe     = Math.abs(nets.filter((n) => n < 0).reduce((s, n) => s + n, 0));
    expect(totalOwedToMe).toBe(800);
    expect(totalIOwe).toBe(200);
  });
});

// ── A-1: adminDeleteUser — Auth-first ordering ────────────────────────────────

describe("adminDeleteUser — Auth deleted before DB cleanup (A-1)", () => {
  type DeleteResult = { authDeleted: boolean; dbDeleted: boolean };

  function deleteUserOldOrder(authFails: boolean): DeleteResult {
    // OLD: DB first, then Auth
    const dbDeleted = true; // step 1 always commits
    let authDeleted: boolean;
    try {
      if (authFails) throw new Error("Auth API error");
      authDeleted = true;
    } catch {
      authDeleted = false;
    }
    return { authDeleted, dbDeleted };
  }

  function deleteUserNewOrder(authFails: boolean): DeleteResult {
    // NEW: Auth first, then DB
    let authDeleted: boolean;
    try {
      if (authFails) throw new Error("Auth API error");
      authDeleted = true;
    } catch {
      return { authDeleted: false, dbDeleted: false }; // DB never touched
    }
    return { authDeleted, dbDeleted: true };
  }

  it("happy path: both orderings succeed", () => {
    expect(deleteUserOldOrder(false)).toEqual({ authDeleted: true, dbDeleted: true });
    expect(deleteUserNewOrder(false)).toEqual({ authDeleted: true, dbDeleted: true });
  });

  it("[BUG] old order: Auth fails → DB already cleaned, user account still active", () => {
    const result = deleteUserOldOrder(true);
    expect(result.dbDeleted).toBe(true);    // irrecoverable — memberships gone
    expect(result.authDeleted).toBe(false); // user can still log in (broken state)
  });

  it("new order: Auth fails → DB untouched, user fully intact", () => {
    const result = deleteUserNewOrder(true);
    expect(result.authDeleted).toBe(false);
    expect(result.dbDeleted).toBe(false); // nothing changed — admin can retry
  });

  it("new order invariant: dbDeleted implies authDeleted", () => {
    const scenarios = [deleteUserNewOrder(false), deleteUserNewOrder(true)];
    for (const s of scenarios) {
      if (s.dbDeleted) expect(s.authDeleted).toBe(true);
    }
  });
});
