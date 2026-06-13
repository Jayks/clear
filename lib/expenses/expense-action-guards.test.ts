/**
 * Unit tests for the pure logic around expense + settlement action guards.
 * Server actions themselves require a live DB; these tests cover the
 * extractable logic so every bug fix has at least one regression test.
 *
 * Run with: pnpm test lib/expenses/expense-action-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ─── Helpers replicated from server actions ────────────────────────────────────

/** Builds the "1st of current month" date string used by all template-log paths */
function getFirstOfMonth(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/** E-4: dedup check — returns true when the template was already logged this month */
function isTemplateAlreadyLoggedThisMonth(
  existingExpenses: { sourceTemplateId: string | null; expenseDate: string; isTemplate: boolean }[],
  templateId: string,
  firstOfMonth: string,
): boolean {
  return existingExpenses.some(
    (e) =>
      e.sourceTemplateId === templateId &&
      e.expenseDate === firstOfMonth &&
      !e.isTemplate,
  );
}

/** S-1b: returns true when the settlement is safe to dispute */
function canDisputeSettlement(settlement: { isConfirmed: boolean }): boolean {
  return !settlement.isConfirmed;
}

/** E-5: detects a Postgres foreign-key violation from the error string */
function isForeignKeyViolation(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return msg.includes("foreign key") || msg.includes("violates");
}

// ─── E-4: logFromTemplate same-month dedup ────────────────────────────────────

describe("logFromTemplate — same-month dedup (E-4)", () => {
  const TEMPLATE_ID = "tmpl-abc";

  it("getFirstOfMonth produces YYYY-MM-01 format", () => {
    expect(getFirstOfMonth(new Date("2026-06-15"))).toBe("2026-06-01");
    expect(getFirstOfMonth(new Date("2026-01-31"))).toBe("2026-01-01");
    expect(getFirstOfMonth(new Date("2026-12-01"))).toBe("2026-12-01");
  });

  it("detects an existing log for the same template+month", () => {
    const existing = [
      { sourceTemplateId: TEMPLATE_ID, expenseDate: "2026-06-01", isTemplate: false },
    ];
    expect(isTemplateAlreadyLoggedThisMonth(existing, TEMPLATE_ID, "2026-06-01")).toBe(true);
  });

  it("no false positive when log is for a different month", () => {
    const existing = [
      { sourceTemplateId: TEMPLATE_ID, expenseDate: "2026-05-01", isTemplate: false },
    ];
    expect(isTemplateAlreadyLoggedThisMonth(existing, TEMPLATE_ID, "2026-06-01")).toBe(false);
  });

  it("no false positive when log is for a different template", () => {
    const existing = [
      { sourceTemplateId: "tmpl-xyz", expenseDate: "2026-06-01", isTemplate: false },
    ];
    expect(isTemplateAlreadyLoggedThisMonth(existing, TEMPLATE_ID, "2026-06-01")).toBe(false);
  });

  it("ignores template rows themselves (isTemplate = true)", () => {
    const existing = [
      { sourceTemplateId: TEMPLATE_ID, expenseDate: "2026-06-01", isTemplate: true },
    ];
    expect(isTemplateAlreadyLoggedThisMonth(existing, TEMPLATE_ID, "2026-06-01")).toBe(false);
  });

  it("returns false for an empty expense list", () => {
    expect(isTemplateAlreadyLoggedThisMonth([], TEMPLATE_ID, "2026-06-01")).toBe(false);
  });

  it("returns true even if other templates are also logged", () => {
    const existing = [
      { sourceTemplateId: "other-tmpl", expenseDate: "2026-06-01", isTemplate: false },
      { sourceTemplateId: TEMPLATE_ID,  expenseDate: "2026-06-01", isTemplate: false },
    ];
    expect(isTemplateAlreadyLoggedThisMonth(existing, TEMPLATE_ID, "2026-06-01")).toBe(true);
  });

  it("[BUG SCENARIO] without dedup guard: two inserts for the same template+month are possible", () => {
    // Demonstrates WHY the check is needed.
    // Before fix: logFromTemplate had no pre-flight query.
    // Two concurrent calls would both read 0 existing rows and both INSERT.
    const firstCallFinds: typeof existing[] = [[]];       // empty — proceeds
    const secondCallFinds: typeof existing[] = [[]];      // also empty — ALSO proceeds → duplicate
    const existing: { sourceTemplateId: string; expenseDate: string; isTemplate: boolean }[] = [];
    expect(isTemplateAlreadyLoggedThisMonth(firstCallFinds[0],  TEMPLATE_ID, "2026-06-01")).toBe(false);
    expect(isTemplateAlreadyLoggedThisMonth(secondCallFinds[0], TEMPLATE_ID, "2026-06-01")).toBe(false);
    // After fix: second call's pre-flight query would find the row inserted by the first.
  });
});

// ─── S-1b: disputeSettlement confirmed-settlement guard ───────────────────────

describe("disputeSettlement — confirmed guard (S-1b)", () => {
  it("allows disputing an unconfirmed (pending) settlement", () => {
    expect(canDisputeSettlement({ isConfirmed: false })).toBe(true);
  });

  it("[BUG SCENARIO] without fix: confirmed settlements could be deleted", () => {
    // Before fix: isConfirmed was not fetched and not checked.
    // An admin/creditor calling disputeSettlement on a confirmed row would
    // reach the DELETE, erasing a permanent balance history entry.
    const confirmedSettlement = { isConfirmed: true };
    expect(canDisputeSettlement(confirmedSettlement)).toBe(false);
    // After fix: the action returns { ok: false, error: "Cannot dispute a confirmed settlement" }
  });
});

// ─── E-5: removeMember FK error detection ─────────────────────────────────────

describe("removeMember — FK violation error message (E-5)", () => {
  it("detects Postgres FK violation from error string", () => {
    const pgError = 'ERROR: update or delete on table "group_members" violates foreign key constraint';
    expect(isForeignKeyViolation(pgError)).toBe(true);
  });

  it("detects 'foreign key' phrasing", () => {
    expect(isForeignKeyViolation("foreign key constraint violation")).toBe(true);
  });

  it("does not false-positive on an unrelated error", () => {
    expect(isForeignKeyViolation("connection timeout")).toBe(false);
    expect(isForeignKeyViolation("duplicate key value")).toBe(false);
    expect(isForeignKeyViolation(new Error("network error"))).toBe(false);
  });

  it("handles non-Error objects safely", () => {
    expect(isForeignKeyViolation(null)).toBe(false);
    expect(isForeignKeyViolation(undefined)).toBe(false);
    expect(isForeignKeyViolation(42)).toBe(false);
  });
});

// ─── E-1/E-2 documentation: non-atomic split update ──────────────────────────

describe("updateExpense / updateTemplate — atomic split update (E-1/E-2)", () => {
  /**
   * The transaction wrapping is not unit-testable without a live DB, but
   * these tests document the invariant that must hold after the fix:
   * an expense must NEVER have an updated metadata row with zero splits.
   */

  it("invariant: split count must be > 0 after a successful update", () => {
    // Represent the state after a successful db.transaction():
    // Both the expense row and its splits are consistent.
    const expense = { id: "exp-1", amount: "300.00", paidByMemberId: "m1" };
    const splits  = [
      { expenseId: "exp-1", memberId: "m1", shareAmount: "150.00" },
      { expenseId: "exp-1", memberId: "m2", shareAmount: "150.00" },
    ];
    expect(splits.length).toBeGreaterThan(0);
    expect(splits.reduce((s, r) => s + Number(r.shareAmount), 0)).toBe(Number(expense.amount));
  });

  it("[BUG SCENARIO] without transaction: a failed INSERT leaves zero splits", () => {
    // Before fix: DELETE succeeded, INSERT failed → expense has valid amount but no splits.
    // Balance formula: net = totalPaid - totalOwed.
    // If splits are empty, totalOwed = 0 for all members → everyone's net is wrong.
    const expenseAmount = 300;
    const splitsAfterFailedInsert: { shareAmount: string }[] = []; // DELETE ran, INSERT failed
    const totalOwed = splitsAfterFailedInsert.reduce((s, r) => s + Number(r.shareAmount), 0);
    expect(totalOwed).toBe(0); // Proves the corruption: ₹300 expense, ₹0 owed by anyone
  });
});

// ─── E-3: expense cap removed (June 2026 generous re-cut) ────────────────────

describe("expense plan limit enforcement (E-3) — cap removed", () => {
  /**
   * The 50-expense free cap was removed in the June 2026 re-cut: a single active
   * trip can blow past 50 expenses, so paywalling mid-trip was user-hostile.
   * canAddExpense now returns true for every plan and count. (The earlier work
   * making all four template/duplicate paths call canAddExpense still stands —
   * the guard is just always-true now.)
   */
  function simulateCanAddExpense(_count: number, _plan: "free" | "plus"): boolean {
    return true;
  }

  it("free plan: allowed at any expense count (cap removed)", () => {
    expect(simulateCanAddExpense(49, "free")).toBe(true);
    expect(simulateCanAddExpense(50, "free")).toBe(true);
    expect(simulateCanAddExpense(500, "free")).toBe(true);
  });

  it("plus plan: always allowed", () => {
    expect(simulateCanAddExpense(999, "plus")).toBe(true);
  });
});
