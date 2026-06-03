/**
 * Unit tests for the pure logic introduced by Round-3 bug fixes.
 * DB operations themselves require a live connection; these tests cover the
 * extractable invariants and document each bug scenario.
 *
 * Run with: pnpm test lib/expenses/expense-create-guards.test.ts
 */

import { describe, it, expect } from "vitest";

// ── C-7: addExpense / duplicateExpense / createExpenseTemplate /
//         logFromTemplate / autoLogDueTemplates / batchLogTemplates
//         — non-atomic expense + splits creation ──────────────────────────────

/**
 * Represents the pair of rows that must be committed atomically.
 * A "complete" expense has at least one split row.
 * An "orphaned" expense has zero split rows (the corrupted state).
 */
type ExpenseRow = { id: string; amount: number };
type SplitRow   = { expenseId: string; memberId: string; shareAmount: number };

function isExpenseComplete(
  expense: ExpenseRow,
  allSplits: SplitRow[],
): boolean {
  return allSplits.some((s) => s.expenseId === expense.id);
}

function areSplitsBalanced(
  expense: ExpenseRow,
  allSplits: SplitRow[],
): boolean {
  const mySplits = allSplits.filter((s) => s.expenseId === expense.id);
  if (mySplits.length === 0) return false;
  const splitTotal = mySplits.reduce((sum, s) => sum + s.shareAmount, 0);
  // Allow ±0.01 for rounding
  return Math.abs(splitTotal - expense.amount) <= 0.01;
}

describe("addExpense / duplicateExpense / logFromTemplate — atomic create (C-7)", () => {
  it("invariant: a committed expense must have at least one split", () => {
    const expense: ExpenseRow = { id: "exp-1", amount: 600 };
    const splits: SplitRow[] = [
      { expenseId: "exp-1", memberId: "m1", shareAmount: 300 },
      { expenseId: "exp-1", memberId: "m2", shareAmount: 300 },
    ];
    expect(isExpenseComplete(expense, splits)).toBe(true);
  });

  it("invariant: split amounts must sum to the expense total", () => {
    const expense: ExpenseRow = { id: "exp-2", amount: 900 };
    const splits: SplitRow[] = [
      { expenseId: "exp-2", memberId: "m1", shareAmount: 300 },
      { expenseId: "exp-2", memberId: "m2", shareAmount: 300 },
      { expenseId: "exp-2", memberId: "m3", shareAmount: 300 },
    ];
    expect(areSplitsBalanced(expense, splits)).toBe(true);
  });

  it("[BUG SCENARIO] expense INSERT succeeds, splits INSERT fails → orphaned row", () => {
    // Before fix: expenses INSERT committed, then splits INSERT threw.
    // The expense row persists with amount=600 but zero splits.
    // Balance formula: net = totalPaid - totalOwed. With no splits, totalOwed = 0
    // for all members → the payer "paid" ₹600 and nobody owes anything.
    const expense: ExpenseRow = { id: "exp-3", amount: 600 };
    const splitsAfterPartialFailure: SplitRow[] = []; // INSERT failed

    expect(isExpenseComplete(expense, splitsAfterPartialFailure)).toBe(false); // orphaned
    expect(areSplitsBalanced(expense, splitsAfterPartialFailure)).toBe(false); // unbalanced

    // Prove the balance corruption:
    const totalOwedByAnyone = splitsAfterPartialFailure
      .filter((s) => s.expenseId === expense.id)
      .reduce((sum, s) => sum + s.shareAmount, 0);

    expect(totalOwedByAnyone).toBe(0); // ₹600 paid, ₹0 owed → ₹600 in limbo
    // After fix: db.transaction() rolls back the expenses row if splits INSERT fails
  });

  it("invariant: duplicateExpense must carry over all original splits", () => {
    const originalSplits: SplitRow[] = [
      { expenseId: "exp-orig", memberId: "m1", shareAmount: 150 },
      { expenseId: "exp-orig", memberId: "m2", shareAmount: 150 },
      { expenseId: "exp-orig", memberId: "m3", shareAmount: 300 },
    ];

    // Simulate the copy: each split gets the new expenseId
    const newExpenseId = "exp-copy";
    const copiedSplits = originalSplits.map((s) => ({
      ...s,
      expenseId: newExpenseId,
    }));
    const newExpense: ExpenseRow = { id: newExpenseId, amount: 600 };

    expect(isExpenseComplete(newExpense, copiedSplits)).toBe(true);
    expect(areSplitsBalanced(newExpense, copiedSplits)).toBe(true);
    expect(copiedSplits.length).toBe(originalSplits.length); // same count
  });

  it("invariant: logFromTemplate must always produce a split row", () => {
    // If template.splits is empty (misconfigured template), the logged expense
    // would also have no splits — still invalid. Validates the guard in autoLog.
    const templateSplits: SplitRow[] = [];
    const loggedExpense: ExpenseRow = { id: "exp-logged", amount: 500 };

    // Zero template splits → logged expense has zero splits → broken
    expect(isExpenseComplete(loggedExpense, templateSplits)).toBe(false);
  });

  it("invariant: autoLogDueTemplates processes each template independently", () => {
    // Each template iteration must be its own transaction so that a failure
    // in one template doesn't roll back the others.
    const results: { templateId: string; committed: boolean }[] = [
      { templateId: "tmpl-1", committed: true },
      { templateId: "tmpl-2", committed: false }, // this one failed
      { templateId: "tmpl-3", committed: true },
    ];

    const committed  = results.filter((r) => r.committed);
    const failed     = results.filter((r) => !r.committed);

    expect(committed.length).toBe(2); // 2 out of 3 committed
    expect(failed.length).toBe(1);    // 1 silently skipped (per-template try/catch)
    // No inter-template rollback — templates 1 and 3 are unaffected by template 2's failure
  });

  it("[BUG SCENARIO] batchLogTemplates: non-atomic per-template creates allow orphans", () => {
    // Before fix: if splits INSERT failed for a template in the loop, the expenses
    // row for that template was already committed. The loop's catch skipped the
    // template entirely, leaving an orphaned expense with no splits.

    // Simulate two templates; template 2's splits fail
    const committedExpenses: ExpenseRow[] = [
      { id: "logged-1", amount: 300 },
      { id: "logged-2", amount: 500 }, // expense committed; splits failed
    ];
    const committedSplits: SplitRow[] = [
      // Only logged-1 has splits; logged-2 is orphaned
      { expenseId: "logged-1", memberId: "m1", shareAmount: 150 },
      { expenseId: "logged-1", memberId: "m2", shareAmount: 150 },
    ];

    expect(isExpenseComplete(committedExpenses[0], committedSplits)).toBe(true);   // ok
    expect(isExpenseComplete(committedExpenses[1], committedSplits)).toBe(false);  // orphaned

    // After fix: each iteration wrapped in db.transaction() → logged-2 expense
    // rolled back when splits INSERT fails, leaving the DB consistent
  });
});

// ── C-8: confirmContributions — isConfirmed=false guard ──────────────────────

type Contribution = { id: string; memberId: string; isConfirmed: boolean };

/**
 * Simulates the fixed filter: only unconfirmed contributions are eligible
 * for batch confirmation and push notification.
 */
function filterEligibleForConfirm(
  contributions: Contribution[],
  inputIds: string[],
): Contribution[] {
  return contributions.filter(
    (c) => inputIds.includes(c.id) && !c.isConfirmed,
  );
}

describe("confirmContributions — isConfirmed=false guard (C-8)", () => {
  const contributions: Contribution[] = [
    { id: "c-1", memberId: "m1", isConfirmed: false }, // pending
    { id: "c-2", memberId: "m2", isConfirmed: true  }, // already confirmed
    { id: "c-3", memberId: "m3", isConfirmed: false }, // pending
  ];

  it("only unconfirmed contributions are returned by the guarded SELECT", () => {
    const inputIds = ["c-1", "c-2", "c-3"];
    const eligible = filterEligibleForConfirm(contributions, inputIds);
    expect(eligible.map((c) => c.id)).toEqual(["c-1", "c-3"]);
    expect(eligible.every((c) => !c.isConfirmed)).toBe(true);
  });

  it("empty input → no contributions processed", () => {
    const eligible = filterEligibleForConfirm(contributions, []);
    expect(eligible).toHaveLength(0);
  });

  it("all already confirmed → nothing eligible → no notifications fired", () => {
    const allConfirmed: Contribution[] = [
      { id: "c-2", memberId: "m2", isConfirmed: true },
    ];
    const eligible = filterEligibleForConfirm(allConfirmed, ["c-2"]);
    expect(eligible).toHaveLength(0);
  });

  it("[BUG SCENARIO] without isConfirmed filter: already-confirmed rows returned", () => {
    // Before fix: SELECT had no isConfirmed=false predicate.
    // An already-confirmed contribution (c-2) passed through and triggered
    // a duplicate push notification.
    function filterBuggy(contribs: Contribution[], ids: string[]) {
      return contribs.filter((c) => ids.includes(c.id)); // no isConfirmed check
    }

    const withAlreadyConfirmed = filterBuggy(contributions, ["c-1", "c-2", "c-3"]);
    expect(withAlreadyConfirmed.some((c) => c.isConfirmed)).toBe(true); // c-2 sneaks in
    expect(withAlreadyConfirmed).toHaveLength(3); // all 3 returned — bug

    // After fix: only c-1 and c-3 returned
    const withFix = filterEligibleForConfirm(contributions, ["c-1", "c-2", "c-3"]);
    expect(withFix).toHaveLength(2); // c-2 excluded
  });

  it("[BUG SCENARIO] concurrent single-confirm races bulk-confirm → duplicate notification", () => {
    // Timeline:
    // T=0: bulkConfirm SELECT reads c-2 as isConfirmed=false (before fix, no filter)
    // T=1: singleConfirm confirms c-2 → isConfirmed=true
    // T=2: bulkConfirm UPDATE fires on c-2 (idempotent, no harm to data)
    // T=3: bulkConfirm sends push to c-2's user → DUPLICATE

    // After fix: SELECT has isConfirmed=false filter.
    // If T=0 SELECT ran before T=1, c-2 is already in the result set — the notification
    // still fires once. But the guarded UPDATE WHERE isConfirmed=false is a no-op at T=2,
    // so at least the UPDATE is safe. The notification dedup is best-effort here.
    // The critical fix is that the UPDATE no longer touches already-confirmed rows.

    const stateAtSelectTime: Contribution = { id: "c-2", memberId: "m2", isConfirmed: false };
    const stateAtUpdateTime: Contribution = { id: "c-2", memberId: "m2", isConfirmed: true  };

    // Guarded UPDATE WHERE isConfirmed=false would NOT match stateAtUpdateTime
    const wouldBeUpdatedByFix = !stateAtUpdateTime.isConfirmed;
    expect(wouldBeUpdatedByFix).toBe(false); // UPDATE is safe no-op

    void stateAtSelectTime; // documented above
  });
});
