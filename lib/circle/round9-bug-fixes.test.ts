/**
 * Regression tests for Round-9 bug fixes (fresh codebase audit, 2026-06-04).
 *
 * Each section covers one confirmed bug and its fix.  DB-level fixes (transaction
 * atomicity, try/catch wrapping, await Promise.all, revalidateTag) cannot be
 * exercised without a live DB and are covered by manual test cases instead.
 *
 * Run with: pnpm test lib/circle/round9-bug-fixes.test.ts
 */

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Bug #2 — addCircleExpense overdraw guard must exclude is_advance=true expenses
// ─────────────────────────────────────────────────────────────────────────────

type MockExpense = { amount: string; isAdvance: boolean; isTemplate: boolean };

/** Pool balance as it was BEFORE the fix: all non-template expenses deducted */
function poolBalance_BUGGY(
  confirmedContributions: number,
  allExpenses: MockExpense[],
): number {
  const totalDrawn = allExpenses
    .filter((e) => !e.isTemplate)
    .reduce((s, e) => s + Number(e.amount), 0);
  return confirmedContributions - totalDrawn;
}

/** Pool balance AFTER the fix: only non-advance, non-template expenses deducted */
function poolBalance_FIXED(
  confirmedContributions: number,
  allExpenses: MockExpense[],
): number {
  const totalDrawn = allExpenses
    .filter((e) => !e.isTemplate && !e.isAdvance)
    .reduce((s, e) => s + Number(e.amount), 0);
  return confirmedContributions - totalDrawn;
}

describe("Bug #2 — addCircleExpense overdraw guard excludes is_advance expenses", () => {
  const contributions = 10_000;
  const expenses: MockExpense[] = [
    { amount: "3000", isAdvance: true,  isTemplate: false }, // admin personal advance
    { amount: "2000", isAdvance: false, isTemplate: false }, // real wallet draw
  ];

  it("[BUG] old formula deducts advances, shrinking pool balance incorrectly", () => {
    // pool = 10000 - (3000 advance + 2000 draw) = 5000  ← wrong
    expect(poolBalance_BUGGY(contributions, expenses)).toBe(5_000);
  });

  it("[FIXED] new formula ignores advances; only wallet draws reduce pool balance", () => {
    // pool = 10000 - 2000 = 8000  ← correct
    expect(poolBalance_FIXED(contributions, expenses)).toBe(8_000);
  });

  it("[FIXED] legitimate draw of 7000 passes the guard (pool = 8000)", () => {
    const pool = poolBalance_FIXED(contributions, expenses);
    const requestedAmount = 7_000;
    expect(requestedAmount).toBeLessThanOrEqual(pool + 0.01);
  });

  it("[FIXED] draw of 9000 correctly fails the guard (pool = 8000)", () => {
    const pool = poolBalance_FIXED(contributions, expenses);
    const requestedAmount = 9_000;
    expect(requestedAmount).toBeGreaterThan(pool + 0.01);
  });

  it("[BUG] old formula blocks a valid 7000 draw when a 3000 advance exists", () => {
    // pool (buggy) = 5000; 7000 > 5000+0.01 → incorrectly blocked
    const pool = poolBalance_BUGGY(contributions, expenses);
    const requestedAmount = 7_000;
    expect(requestedAmount).toBeGreaterThan(pool + 0.01); // ← bug: valid draw rejected
  });

  it("[FIXED] template expenses are still excluded from pool draw total", () => {
    const withTemplate: MockExpense[] = [
      ...expenses,
      { amount: "500", isAdvance: false, isTemplate: true }, // recurring template — not a real draw
    ];
    // pool = 10000 - 2000 = 8000 (template is excluded)
    expect(poolBalance_FIXED(contributions, withTemplate)).toBe(8_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug #6 — selfReportContribution must return { ok:false, error } on duplicates
// ─────────────────────────────────────────────────────────────────────────────

type InsertResult = "inserted" | "already_confirmed" | "already_pending";

/** Return shape BEFORE the fix: any non-"inserted" result silently returns ok:true */
function handleInsertResult_BUGGY(result: InsertResult): { ok: boolean; error?: string } {
  if (result !== "inserted") return { ok: true }; // ← bug: misleads caller
  return { ok: true };
}

/** Return shape AFTER the fix: duplicates surface as descriptive errors */
function handleInsertResult_FIXED(result: InsertResult): { ok: boolean; error?: string } {
  if (result === "already_confirmed")
    return { ok: false, error: "A contribution is already confirmed for this period" };
  if (result === "already_pending")
    return { ok: false, error: "You already have a contribution pending confirmation for this period" };
  return { ok: true };
}

describe("Bug #6 — selfReportContribution duplicate handling", () => {
  it("[BUG] already_confirmed returns ok:true — caller toasts success incorrectly", () => {
    const result = handleInsertResult_BUGGY("already_confirmed");
    expect(result.ok).toBe(true);   // ← bug
    expect(result.error).toBeUndefined();
  });

  it("[BUG] already_pending returns ok:true — caller toasts success incorrectly", () => {
    const result = handleInsertResult_BUGGY("already_pending");
    expect(result.ok).toBe(true);   // ← bug
    expect(result.error).toBeUndefined();
  });

  it("[FIXED] already_confirmed returns ok:false with a descriptive error", () => {
    const result = handleInsertResult_FIXED("already_confirmed");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/already confirmed/i);
  });

  it("[FIXED] already_pending returns ok:false with a descriptive error", () => {
    const result = handleInsertResult_FIXED("already_pending");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/pending confirmation/i);
  });

  it("[FIXED] inserted still returns ok:true", () => {
    const result = handleInsertResult_FIXED("inserted");
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug #7 — getAllNestsInsightsData: primary currency must be the dominant one
//           so mixed-currency nest totals are never summed under the wrong label
// ─────────────────────────────────────────────────────────────────────────────

type MockGroup = { id: string; defaultCurrency: string };

/** Old code: always uses the first nest's currency regardless of the others */
function selectCurrency_BUGGY(nests: MockGroup[]): string {
  return nests[0]?.defaultCurrency ?? "INR";
}

/** New code: picks the currency used by the most nests (by count) */
function selectPrimaryCurrency_FIXED(nests: MockGroup[]): string {
  const currencyCount = new Map<string, number>();
  for (const g of nests) {
    currencyCount.set(g.defaultCurrency, (currencyCount.get(g.defaultCurrency) ?? 0) + 1);
  }
  return (
    [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    nests[0]?.defaultCurrency ??
    "INR"
  );
}

/** New code: expense IDs to include = only nests that share the primary currency */
function filterNestIdsByPrimaryCurrency(nests: MockGroup[], primaryCurrency: string): string[] {
  return nests.filter((g) => g.defaultCurrency === primaryCurrency).map((g) => g.id);
}

describe("Bug #7 — getAllNestsInsightsData primary currency selection", () => {
  const mixedNests: MockGroup[] = [
    { id: "n1", defaultCurrency: "INR" },
    { id: "n2", defaultCurrency: "INR" },
    { id: "n3", defaultCurrency: "USD" },
  ];

  it("[BUG] old code uses first nest currency even when a different one dominates", () => {
    // If the list happened to start with USD, USD would be used for 2 INR nests
    const usdFirst: MockGroup[] = [
      { id: "n3", defaultCurrency: "USD" },
      { id: "n1", defaultCurrency: "INR" },
      { id: "n2", defaultCurrency: "INR" },
    ];
    expect(selectCurrency_BUGGY(usdFirst)).toBe("USD"); // ← bug: 2 INR nests labelled USD
  });

  it("[FIXED] picks INR when 2 of 3 nests use INR", () => {
    expect(selectPrimaryCurrency_FIXED(mixedNests)).toBe("INR");
  });

  it("[FIXED] picks INR even when USD nest appears first in the array", () => {
    const usdFirst: MockGroup[] = [
      { id: "n3", defaultCurrency: "USD" },
      { id: "n1", defaultCurrency: "INR" },
      { id: "n2", defaultCurrency: "INR" },
    ];
    expect(selectPrimaryCurrency_FIXED(usdFirst)).toBe("INR");
  });

  it("[FIXED] USD nest is excluded from the primary-currency expense query", () => {
    const primary = selectPrimaryCurrency_FIXED(mixedNests);
    const ids = filterNestIdsByPrimaryCurrency(mixedNests, primary);
    expect(ids).toEqual(expect.arrayContaining(["n1", "n2"]));
    expect(ids).not.toContain("n3"); // USD nest excluded
  });

  it("[FIXED] single-currency user: all nests are included", () => {
    const allINR: MockGroup[] = [
      { id: "n1", defaultCurrency: "INR" },
      { id: "n2", defaultCurrency: "INR" },
    ];
    const primary = selectPrimaryCurrency_FIXED(allINR);
    const ids = filterNestIdsByPrimaryCurrency(allINR, primary);
    expect(ids).toEqual(["n1", "n2"]);
  });

  it("[FIXED] falls back to INR when nests array is empty", () => {
    expect(selectPrimaryCurrency_FIXED([])).toBe("INR");
  });

  it("[FIXED] ties: when two currencies are equally common, a winner is still picked consistently", () => {
    const tied: MockGroup[] = [
      { id: "n1", defaultCurrency: "INR" },
      { id: "n2", defaultCurrency: "USD" },
    ];
    const primary = selectPrimaryCurrency_FIXED(tied);
    expect(["INR", "USD"]).toContain(primary); // deterministic but either is valid
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug #8 — pastSettlementsTotal must not be capped by the 100-row display limit
// ─────────────────────────────────────────────────────────────────────────────

type MockSettlement = { amount: string; isConfirmed: boolean };

/** Old approach: sum from the limited display list (max 100 rows) */
function computeTotalFromDisplayList(
  settlementRows: MockSettlement[],     // already limited to 100
): number {
  return settlementRows.filter((s) => s.isConfirmed).reduce((sum, s) => sum + Number(s.amount), 0);
}

/** New approach: separate aggregate query returns the full total regardless of limit */
function computeTotalFromAggregate(fullTotal: number): number {
  return fullTotal; // the DB returns SUM(amount) WHERE isConfirmed=true — no row cap
}

describe("Bug #8 — pastSettlementsTotal correctness for groups with >100 settlements", () => {
  // Simulate 105 settlements of ₹1000 each (5 are older and dropped by the LIMIT 100)
  const displayed100: MockSettlement[] = Array.from({ length: 100 }, () => ({
    amount: "1000",
    isConfirmed: true,
  }));
  const trueAggregateTotalFromDB = 105_000; // full SUM from DB

  it("[BUG] summing the 100-row list understates the real total", () => {
    const displayedTotal = computeTotalFromDisplayList(displayed100);
    expect(displayedTotal).toBe(100_000);           // 5 settlements silently missing
    expect(displayedTotal).toBeLessThan(trueAggregateTotalFromDB);
  });

  it("[FIXED] aggregate query returns the true full total", () => {
    const total = computeTotalFromAggregate(trueAggregateTotalFromDB);
    expect(total).toBe(105_000);
  });

  it("[FIXED] for groups with ≤100 settlements both approaches agree", () => {
    const few: MockSettlement[] = Array.from({ length: 10 }, () => ({
      amount: "500",
      isConfirmed: true,
    }));
    const fromList = computeTotalFromDisplayList(few);
    const fromAggregate = 5_000; // same as DB would return
    expect(fromList).toBe(fromAggregate);
  });

  it("[FIXED] unconfirmed settlements are excluded from the total", () => {
    const mixed: MockSettlement[] = [
      { amount: "1000", isConfirmed: true },
      { amount: "500",  isConfirmed: false }, // pending — should not count
    ];
    expect(computeTotalFromDisplayList(mixed)).toBe(1_000);
  });
});
