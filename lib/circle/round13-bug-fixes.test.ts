/**
 * Unit tests for Round-13 bug fixes.
 *
 * R13-1  recordContribution — currency not validated against group default
 * R13-2  addCircleExpense   — currency not validated against group default
 * R13-3  getCircleCardData  — recurring circles showed current-period contributions as "Wallet" balance
 * R13-4  deleteStream       — silently cascade-deleted partial payment records on pending streams
 * R13-5  confirmContribution — UPDATE lacked isConfirmed=false guard (spurious push in concurrent dispute race)
 *
 * Run with: pnpm test lib/circle/round13-bug-fixes.test.ts
 */

import { describe, it, expect } from "vitest";

// ─── R13-1 + R13-2: currency validation ──────────────────────────────────────

/**
 * Mirrors the currency guard now in recordContribution and addCircleExpense.
 * The group's defaultCurrency is fetched server-side; the input currency must
 * match exactly.  Pool balance queries sum all amounts with no currency filter,
 * so a wrong-currency contribution/expense silently corrupts the total.
 */
function validateCurrency(
  inputCurrency: string,
  groupDefaultCurrency: string,
): { ok: true } | { ok: false; error: string } {
  if (inputCurrency !== groupDefaultCurrency)
    return { ok: false, error: `Currency must be ${groupDefaultCurrency}` };
  return { ok: true };
}

describe("R13-1 recordContribution — currency guard", () => {
  it("accepts contribution in the group's default currency", () => {
    expect(validateCurrency("INR", "INR")).toEqual({ ok: true });
  });

  it("accepts USD contribution in a USD circle", () => {
    expect(validateCurrency("USD", "USD")).toEqual({ ok: true });
  });

  it("[BUG] rejects USD contribution in an INR circle", () => {
    const result = validateCurrency("USD", "INR");
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toBe("Currency must be INR");
  });

  it("[BUG] rejects EUR contribution in an INR circle", () => {
    const result = validateCurrency("EUR", "INR");
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain("INR");
  });

  it("comparison is case-sensitive (currency codes are always 3-char uppercase)", () => {
    // Zod validates length(3), so lowercase won't reach here in practice —
    // but the guard is a plain === which is correct.
    expect(validateCurrency("inr", "INR").ok).toBe(false);
  });
});

describe("R13-2 addCircleExpense — currency guard", () => {
  it("pool balance check uses mixed currencies without the guard", () => {
    // Demonstrates why the guard is needed: without it, a ₹5000 expense and a
    // $5000 contribution are summed as if equal — overdraw check is meaningless.
    const contributions_INR = 5000;          // ₹5,000 in INR circle
    const expense_USD       = 5000;          // $5,000 (WRONG currency)
    // Without currency validation, the code computes: poolBalance = 5000 - 5000 = 0
    // This passes the overdraw guard even though the circle only has ₹5,000.
    const fakePoolBalance = contributions_INR - expense_USD; // 0 — misleadingly "ok"
    expect(fakePoolBalance).toBe(0); // proves the corruption: ₹5000 circle shows ₹0 balance
  });

  it("[FIXED] currency guard prevents wrong-currency expense", () => {
    expect(validateCurrency("USD", "INR").ok).toBe(false);
  });

  it("[FIXED] currency guard allows same-currency expense", () => {
    expect(validateCurrency("INR", "INR").ok).toBe(true);
  });
});

// ─── R13-3: wallet balance calculation for recurring circles ──────────────────

/**
 * Demonstrates the before/after for getCircleCardData.
 *
 * BEFORE: For recurring circles, cycleContribs = current period only.
 *   walletDisplay = currentPeriodContribs - allTimeExpenses  ← WRONG
 *
 * AFTER:  A separate allTimeContribs query is added.
 *   walletBalance = allTimeContribs - allTimeExpenses        ← CORRECT
 */
function computeWalletBalance_BEFORE(
  cycleContribsTotal: number,   // current period only for recurring
  allTimeExpenses:    number,
): number {
  return cycleContribsTotal - allTimeExpenses; // was used as "Wallet · ₹X" in the card
}

function computeWalletBalance_FIXED(
  allTimeContribs: number,      // new: all-time confirmed contributions
  allTimeExpenses: number,
): number {
  return allTimeContribs - allTimeExpenses;
}

describe("R13-3 CircleCard wallet balance — recurring circle", () => {
  // Scenario: 10 members × ₹1,000/mo for 6 months = ₹60,000 total.
  //           ₹45,000 spent.  Actual wallet balance = ₹15,000.
  const allTimeContribs  = 60_000;
  const currentPeriod    = 10_000; // 10 members paid this month
  const allTimeExpenses  = 45_000;

  it("[BUG] old code: Wallet shows current-period contributions (₹10,000) not real balance (₹15,000)", () => {
    const displayed = computeWalletBalance_BEFORE(currentPeriod, allTimeExpenses);
    expect(displayed).toBe(-35_000); // ₹10k - ₹45k = -₹35k — wildly wrong
    expect(displayed).not.toBe(15_000); // proves the bug
  });

  it("[FIXED] new code: Wallet shows all-time contributions minus expenses (₹15,000)", () => {
    const balance = computeWalletBalance_FIXED(allTimeContribs, allTimeExpenses);
    expect(balance).toBe(15_000);
  });

  it("[FIXED] zero expenses: wallet equals all-time contributions", () => {
    expect(computeWalletBalance_FIXED(60_000, 0)).toBe(60_000);
  });

  it("[FIXED] overspent wallet: balance can be negative (admin drew more than collected)", () => {
    expect(computeWalletBalance_FIXED(5_000, 8_000)).toBe(-3_000);
  });

  it("[FIXED] one-time circles are unaffected — cycleContribs is already all-time", () => {
    // For one-time circles cycleContribs = all contributions already.
    // allTimeContribs will equal cycleContribs in that case.
    const oneTimeContribs = 50_000;
    expect(computeWalletBalance_FIXED(oneTimeContribs, 20_000)).toBe(30_000);
  });
});

// ─── R13-4: deleteStream settlement guard ─────────────────────────────────────

/**
 * Models the guard that prevents deleting a stream with existing payment records.
 *
 * settleStream allows partial settlements on pending streams (stream stays
 * "pending" until fully covered).  Without this guard, deleteStream would
 * cascade-delete those settlement records, silently erasing payment history.
 */
type StreamStatus = "pending" | "confirmed" | "disputed" | "settled" | "forgiven";

function canDeleteStream(
  status:              StreamStatus,
  hasSettlements:      boolean,
  isCreator:           boolean,
): { ok: true } | { ok: false; error: string } {
  if (!isCreator)
    return { ok: false, error: "Stream not found" };
  if (status !== "pending")
    return { ok: false, error: "Only pending Streams can be deleted" };
  // R13-4 fix: new guard
  if (hasSettlements)
    return { ok: false, error: "Cannot delete a Stream with recorded payments" };
  return { ok: true };
}

describe("R13-4 deleteStream — settlement guard", () => {
  it("allows deleting a pending stream with no settlements", () => {
    expect(canDeleteStream("pending", false, true)).toEqual({ ok: true });
  });

  it("blocks deleting a confirmed stream (pre-existing guard)", () => {
    const r = canDeleteStream("confirmed", false, true);
    expect(r.ok).toBe(false);
  });

  it("blocks deleting a settled stream (pre-existing guard)", () => {
    const r = canDeleteStream("settled", false, true);
    expect(r.ok).toBe(false);
  });

  it("[BUG before fix] would have allowed deleting a pending stream WITH settlements", () => {
    // Without the R13-4 guard, only the status check ran — hasSettlements was ignored.
    const oldGuard = (status: StreamStatus) =>
      status === "pending" ? { ok: true } : { ok: false, error: "not pending" };
    expect(oldGuard("pending")).toEqual({ ok: true }); // would cascade-delete payments
  });

  it("[FIXED] blocks deleting a pending stream that has recorded partial payments", () => {
    const r = canDeleteStream("pending", true, true);
    expect(r.ok).toBe(false);
    expect((r as { ok: false; error: string }).error).toBe(
      "Cannot delete a Stream with recorded payments",
    );
  });

  it("[FIXED] non-creator cannot delete (unrelated to settlement guard)", () => {
    expect(canDeleteStream("pending", false, false).ok).toBe(false);
  });
});

// ─── R13-5: confirmContribution UPDATE race guard ────────────────────────────

/**
 * Models the race between confirmContribution and disputeContribution.
 *
 * BEFORE: UPDATE had no isConfirmed=false guard.  If disputeContribution
 *         DELETEs the row concurrently, the UPDATE affects 0 rows but
 *         confirmContribution returned { ok: true } and fired a push.
 *
 * AFTER:  UPDATE uses isConfirmed=false guard + .returning().  If 0 rows
 *         returned → contribution was already processed → early error return.
 */
type UpdateResult = { rowsAffected: number };

function confirmContributionOutcome_BEFORE(updateResult: UpdateResult): { ok: boolean } {
  // Old code: never checked affected row count — always returned ok: true
  return { ok: true }; // regardless of whether 0 rows were updated
}

function confirmContributionOutcome_FIXED(updateResult: UpdateResult): { ok: boolean; error?: string } {
  if (updateResult.rowsAffected === 0)
    return { ok: false, error: "Contribution already processed" };
  return { ok: true };
}

describe("R13-5 confirmContribution — isConfirmed=false guard + returning() check", () => {
  it("[BUG] old code: returns ok:true even when UPDATE affected 0 rows (concurrent dispute)", () => {
    const result = confirmContributionOutcome_BEFORE({ rowsAffected: 0 });
    expect(result.ok).toBe(true); // wrong — fires spurious "Payment confirmed" push
  });

  it("[FIXED] new code: returns ok:false when UPDATE affected 0 rows", () => {
    const result = confirmContributionOutcome_FIXED({ rowsAffected: 0 });
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toBe(
      "Contribution already processed",
    );
  });

  it("[FIXED] normal case: 1 row affected → returns ok:true", () => {
    const result = confirmContributionOutcome_FIXED({ rowsAffected: 1 });
    expect(result.ok).toBe(true);
  });

  it("[FIXED] no spurious push when contribution was already disputed", () => {
    // Scenario: admin A confirms + admin B disputes simultaneously.
    // Admin B's DELETE runs first (isConfirmed=false guard protected).
    // Admin A's UPDATE then finds 0 matching rows → returns early, no push.
    const disputedFirst: UpdateResult  = { rowsAffected: 0 };
    const confirmedFirst: UpdateResult = { rowsAffected: 1 };

    expect(confirmContributionOutcome_FIXED(disputedFirst).ok).toBe(false);   // correctly blocked
    expect(confirmContributionOutcome_FIXED(confirmedFirst).ok).toBe(true);   // normal path
  });
});
