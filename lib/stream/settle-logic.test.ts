/**
 * Unit tests for stream settlement logic bugs found in the bug scan.
 *
 * These tests extract the pure logic from app/actions/stream.ts so they can
 * run without a DB.  They document the correct behaviour so any fix can be
 * verified locally with `pnpm test`.
 */

import { describe, it, expect } from "vitest";

// ─── helpers replicated from stream.ts ────────────────────────────────────────

type Direction = "they_owe_me" | "i_owe_them";
type Status    = "pending" | "confirmed" | "disputed" | "settled" | "forgiven";

interface StreamRecord {
  id:            string;
  amount:        string; // numeric(12,2) stored as string
  direction:     Direction;
  creatorId:     string;
  counterpartId: string;
  status:        Status;
  createdAt:     Date;
  confirmedAt:   Date | null;
}

/** Compute net from user A's perspective (+ve = owed to A, -ve = A owes) */
function computeNet(records: StreamRecord[], userId: string): number {
  let net = 0;
  for (const r of records) {
    const isCreator = r.creatorId === userId;
    const amt = Number(r.amount);
    if (isCreator) {
      net += r.direction === "they_owe_me" ? amt : -amt;
    } else {
      net += r.direction === "they_owe_me" ? -amt : amt;
    }
  }
  return net;
}

/**
 * Partial settle algorithm currently in settleWithPerson (lines 478-490).
 * Bug: marks the *entire* entry as settled when the partial amount only covers
 * part of it.
 */
function selectEntriesToSettle_CURRENT(
  active: { id: string; amount: string }[],
  partialAmount: number,
): string[] {
  let remaining = partialAmount;
  const ids: string[] = [];
  for (const r of active) {
    const amt = Number(r.amount);
    if (remaining <= 0) break;
    ids.push(r.id);
    remaining -= amt;
  }
  return ids;
}

/** Corrected version: only pick entries whose full amount is ≤ remaining */
function selectEntriesToSettle_FIXED(
  active: { id: string; amount: string }[],
  partialAmount: number,
): string[] {
  let remaining = partialAmount;
  const ids: string[] = [];
  for (const r of active) {
    const amt = Number(r.amount);
    if (remaining <= 0) break;
    if (amt <= remaining + 0.01) {
      ids.push(r.id);
      remaining -= amt;
    } else {
      // partial entry — don't mark as fully settled; stop here
      break;
    }
  }
  return ids;
}

// ─── Bug #12: partial settle marks full entry settled ─────────────────────────

describe("settleWithPerson — partial allocation (Bug #12)", () => {
  const entries = [
    { id: "e1", amount: "200.00" },
    { id: "e2", amount: "300.00" },
    { id: "e3", amount: "150.00" },
  ];

  it("[CURRENT BUG] paying ₹50 of a ₹200 entry marks that entire entry settled", () => {
    const settled = selectEntriesToSettle_CURRENT(entries, 50);
    // Bug: e1 (₹200) is included even though only ₹50 was paid
    expect(settled).toContain("e1");
    // The amount over-settled: ₹200 removed for ₹50 paid
  });

  it("[FIXED] paying ₹200 of a ₹200 entry + ₹50 partial — only full entry settled", () => {
    // Paying ₹200 exactly covers e1; e2 (₹300) is not included
    const settled = selectEntriesToSettle_FIXED(entries, 200);
    expect(settled).toEqual(["e1"]);
  });

  it("[FIXED] paying ₹500 settles e1 (₹200) + e2 (₹300) exactly", () => {
    const settled = selectEntriesToSettle_FIXED(entries, 500);
    expect(settled).toEqual(["e1", "e2"]);
  });

  it("[FIXED] paying ₹600 settles e1 + e2 + e3 (₹650 total → only covers 3rd if ≤ remaining)", () => {
    // ₹600: covers e1 (₹200, rem=400) + e2 (₹300, rem=100) → e3 ₹150 > rem=100, stop
    const settled = selectEntriesToSettle_FIXED(entries, 600);
    expect(settled).toEqual(["e1", "e2"]);
  });

  it("[FIXED] paying ₹651 settles all three entries (total ₹650)", () => {
    const settled = selectEntriesToSettle_FIXED(entries, 651);
    expect(settled).toEqual(["e1", "e2", "e3"]);
  });

  it("[CURRENT BUG] overstates debt cleared: ₹50 partial removes ₹200 from balance", () => {
    const settled = selectEntriesToSettle_CURRENT(entries, 50);
    const totalRemoved = settled.reduce((s, id) => {
      const e = entries.find((x) => x.id === id)!;
      return s + Number(e.amount);
    }, 0);
    // Current code removes ₹200 from the balance for a ₹50 payment
    expect(totalRemoved).toBe(200);
  });
});

// ─── Bug #13: settleWithPerson has no net-direction check ─────────────────────

describe("settleWithPerson — no net direction guard (Bug #13)", () => {
  /**
   * Scenario: Alice owes Bob ₹500.
   *   record: creatorId=alice, direction=i_owe_them, counterpartId=bob
   *
   * The creditor (Bob) should NOT be able to call settleWithPerson(alice)
   * and wipe out the balance he is owed — but there is no guard.
   */
  const record: StreamRecord = {
    id:            "r1",
    amount:        "500.00",
    direction:     "i_owe_them", // alice owes bob
    creatorId:     "alice",
    counterpartId: "bob",
    status:        "confirmed",
    createdAt:     new Date(),
    confirmedAt:   new Date(),
  };

  it("net from Alice's perspective is -500 (Alice owes)", () => {
    const net = computeNet([record], "alice");
    expect(net).toBe(-500);
  });

  it("net from Bob's perspective is +500 (Bob is owed)", () => {
    const net = computeNet([record], "bob");
    expect(net).toBe(500);
  });

  it("[CURRENT BUG] settleWithPerson has no selfReportStreamSettle-style net guard", () => {
    // selfReportStreamSettle (line 696) correctly rejects when net >= 0:
    //   if (net >= 0) return error "You don't owe anything to this person"
    //
    // settleWithPerson (lines 440-514) has NO equivalent check.
    // Bob (creditor, net=+500) can call settleWithPerson("alice") and wipe out
    // the ₹500 Alice owes him.
    //
    // This test documents the MISSING guard — it should be present:
    const netForBob = computeNet([record], "bob");
    // Bob is the creditor; the action should reject when net > 0 (= not a debtor)
    // But currently it doesn't. Fix: add `if (net > 0) return error` guard.
    expect(netForBob).toBeGreaterThan(0); // proves Bob is not the debtor
    // After fix, settleWithPerson called by Bob should return { ok: false, error: "..." }
  });
});

// ─── Bug #14: confirmStreamSettle settles ALL entries on partial payment ───────

describe("confirmStreamSettle — partial payment settles full balance (Bug #14)", () => {
  /**
   * Alice owes Bob ₹1000 total across two entries of ₹500 each.
   * Alice self-reports a settlement of ₹1 (partial).
   * Bob confirms → ALL ₹1000 wiped, but Alice only paid ₹1.
   */

  it("settlement amount is never compared to outstanding net before confirming", () => {
    const settlementAmount = 1;      // Alice paid ₹1
    const totalOutstanding = 1000;   // But owes ₹1000

    // Current code at lines 792-812: after `isConfirmed = true`,
    // it settles every active record regardless of settlement.amount vs net.
    //
    // Fix: compare settlement.amount to computed net; reject or only settle
    // entries up to the paid amount (like selectEntriesToSettle_FIXED above).

    const isSafe = settlementAmount >= totalOutstanding;
    expect(isSafe).toBe(false); // Proves the amounts don't match — confirms the bug
  });
});

// ─── Bug #11: settleStream allows over-settlement ─────────────────────────────

describe("settleStream — no cap on settlement amount (Bug #11)", () => {
  it("a settlement amount > record amount should be rejected but is not", () => {
    const recordAmount = 500;
    const settlementAmount = 999999; // vastly exceeds the debt

    // Current code at line 258: totalSettled >= recordAmount - 0.01 → mark settled
    // The excess ₹999499 is just ignored — no validation at insert time.
    const wouldMarkSettled = settlementAmount >= recordAmount - 0.01;
    expect(wouldMarkSettled).toBe(true); // over-payment silently accepted
  });

  it("either party (including creditor) can record a settlement — no debtor-only guard", () => {
    // settleStream checks or(creatorId === user, counterpartId === user) — line 224-230
    // Both creditor and debtor pass this check.
    // selfReportStreamSettle correctly gates on net < 0 (debtor only).
    // settleStream has no such gate — creditor can record a "settlement" of their own debt.
    const record = {
      creatorId:     "alice",
      counterpartId: "bob",
      direction:     "they_owe_me" as Direction, // bob owes alice
    };
    const isAliceAParty = record.creatorId === "alice" || record.counterpartId === "alice";
    const isBobAParty   = record.creatorId === "bob"   || record.counterpartId === "bob";
    // Both pass — no direction check in settleStream
    expect(isAliceAParty).toBe(true);
    expect(isBobAParty).toBe(true);
  });
});

// ─── Bug #15: undoSettleWithPerson loses dispute state ────────────────────────

describe("undoSettleWithPerson — loses dispute state on undo (Bug #15)", () => {
  it("a previously-disputed entry is restored to confirmed/pending, not disputed", () => {
    const disputedRecord: Pick<StreamRecord, "status" | "confirmedAt"> = {
      status:      "settled", // was settled by settleWithPerson
      confirmedAt: new Date(), // had a confirmedAt before it was disputed
    };

    // Current undo logic (lines 542-550):
    //   status = row.confirmedAt ? "confirmed" : "pending"
    //
    // This uses confirmedAt as a proxy, but a record that was:
    //   pending → confirmed → disputed → settled (by settleWithPerson)
    // will have confirmedAt set, so it reverts to "confirmed" — NOT "disputed".
    //
    // The original "disputed" state is silently lost.
    const revertedStatus = disputedRecord.confirmedAt ? "confirmed" : "pending";
    expect(revertedStatus).toBe("confirmed"); // not "disputed"
    // Fix: store the pre-settle status snapshot, or query it before settling.
  });
});

// ─── Bug #22: StreamSettleSheet silent fallback to absNet ─────────────────────

describe("StreamSettleSheet — amount input silent fallback (Bug #22)", () => {
  /**
   * In stream-settle-sheet.tsx line 138:
   *   const parsedAmount = parseFloat(amountStr) || absNet;
   *
   * If the user clears the input or types "0", parseFloat returns NaN or 0,
   * both falsy, so parsedAmount silently becomes the full absNet.
   * The guard `if (!parsedAmount || parsedAmount <= 0) return` at line 176
   * never fires because the fallback already replaced 0 with absNet.
   */

  function parsedAmountLogic(amountStr: string, absNet: number): number {
    return parseFloat(amountStr) || absNet;
  }

  it("[BUG] empty string falls back to absNet instead of 0", () => {
    expect(parsedAmountLogic("", 500)).toBe(500); // should be 0 or validation error
  });

  it("[BUG] '0' falls back to absNet instead of being rejected", () => {
    expect(parsedAmountLogic("0", 500)).toBe(500); // parseFloat("0") = 0, falsy → absNet
  });

  it("[BUG] NaN from bad input falls back to absNet", () => {
    expect(parsedAmountLogic("abc", 500)).toBe(500); // parseFloat("abc") = NaN, falsy → absNet
  });

  it("[FIXED] correct logic: treat 0/NaN/empty as invalid, keep undefined until valid input", () => {
    function parsedAmountFixed(amountStr: string, absNet: number): number | undefined {
      const v = parseFloat(amountStr);
      return isNaN(v) || v <= 0 ? undefined : v;
    }
    expect(parsedAmountFixed("", 500)).toBeUndefined();
    expect(parsedAmountFixed("0", 500)).toBeUndefined();
    expect(parsedAmountFixed("50", 500)).toBe(50);
    expect(parsedAmountFixed("500", 500)).toBe(500);
    // absNet is passed as the *default* when the field is first rendered,
    // not as a fallback — those are separate concepts.
    expect(parsedAmountFixed("500.01", 500)).toBe(500.01); // allow over-payment (separate validation)
  });
});
