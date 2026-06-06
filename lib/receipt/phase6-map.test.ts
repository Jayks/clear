/**
 * Phase 6 — Expense Map View: pure helper function tests
 *
 * Tests:
 *   isTripActive        — active-trip detection
 *   computeScrubDates   — scrubber date list (trip-range vs. expense-dates mode)
 *   computeRevealFraction — line-trim-offset fraction calculation
 *   getLocatedExpenses  — expense location filter
 *
 * Run with: pnpm test lib/receipt/phase6-map.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  isTripActive,
  computeScrubDates,
  computeRevealFraction,
  getLocatedExpenses,
} from "../expense/map-helpers";
import type { Expense } from "../db/schema/expenses";

// ── isTripActive ──────────────────────────────────────────────────────────────

describe("isTripActive", () => {
  it("returns true when today is within the trip range (inclusive start)", () => {
    expect(isTripActive("2026-06-01", "2026-06-10", "2026-06-01")).toBe(true);
  });

  it("returns true when today is within the trip range (inclusive end)", () => {
    expect(isTripActive("2026-06-01", "2026-06-10", "2026-06-10")).toBe(true);
  });

  it("returns true when today is in the middle of the range", () => {
    expect(isTripActive("2026-06-01", "2026-06-10", "2026-06-05")).toBe(true);
  });

  it("returns false when today is before the trip start", () => {
    expect(isTripActive("2026-06-01", "2026-06-10", "2026-05-31")).toBe(false);
  });

  it("returns false when today is after the trip end", () => {
    expect(isTripActive("2026-06-01", "2026-06-10", "2026-06-11")).toBe(false);
  });

  it("returns false when startDate is null", () => {
    expect(isTripActive(null, "2026-06-10", "2026-06-05")).toBe(false);
  });

  it("returns false when endDate is null", () => {
    expect(isTripActive("2026-06-01", null, "2026-06-05")).toBe(false);
  });

  it("returns false when both dates are null", () => {
    expect(isTripActive(null, null, "2026-06-05")).toBe(false);
  });

  it("returns false when startDate is undefined", () => {
    expect(isTripActive(undefined, "2026-06-10", "2026-06-05")).toBe(false);
  });
});

// ── computeScrubDates ─────────────────────────────────────────────────────────

describe("computeScrubDates — trip has dates", () => {
  it("returns one entry per day for a 3-day trip", () => {
    const dates = computeScrubDates("2026-06-01", "2026-06-03", []);
    expect(dates).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
  });

  it("returns exactly one date for a 1-day trip", () => {
    const dates = computeScrubDates("2026-06-05", "2026-06-05", []);
    expect(dates).toEqual(["2026-06-05"]);
  });

  it("uses trip dates even when expenseDates has more variety", () => {
    // Trip is 3 days; expenses span outside the range — should be ignored
    const dates = computeScrubDates(
      "2026-06-01",
      "2026-06-03",
      ["2026-05-28", "2026-06-01", "2026-06-10"],
    );
    expect(dates).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
  });
});

describe("computeScrubDates — no trip dates (uses expense dates)", () => {
  it("returns unique sorted expense dates when no trip range is given", () => {
    const dates = computeScrubDates(null, null, [
      "2026-04-12",
      "2026-04-10",
      "2026-04-12", // duplicate
      "2026-04-15",
    ]);
    expect(dates).toEqual(["2026-04-10", "2026-04-12", "2026-04-15"]);
  });

  it("returns an empty array when no dates at all", () => {
    const dates = computeScrubDates(undefined, undefined, []);
    expect(dates).toEqual([]);
  });

  it("deduplicates expense dates when startDate is missing", () => {
    const dates = computeScrubDates(null, "2026-06-10", ["2026-06-05", "2026-06-05"]);
    expect(dates).toEqual(["2026-06-05"]);
  });
});

// ── computeRevealFraction ─────────────────────────────────────────────────────

describe("computeRevealFraction", () => {
  const dates = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"];

  it("returns 1 (show all) when scrubDate is null", () => {
    expect(computeRevealFraction(null, dates)).toBe(1);
  });

  it("returns 1 (show all) when scrubDates is empty", () => {
    expect(computeRevealFraction("2026-06-01", [])).toBe(1);
  });

  it("returns 0 for the first date (nothing revealed yet)", () => {
    // idx=0, totalDays=4 → 0/4 = 0
    expect(computeRevealFraction("2026-06-01", dates)).toBe(0);
  });

  it("returns 1 for the last date (full path revealed)", () => {
    // idx=4, totalDays=4 → 4/4 = 1
    expect(computeRevealFraction("2026-06-05", dates)).toBe(1);
  });

  it("returns 0.5 for the middle date of a 5-day range", () => {
    // idx=2, totalDays=4 → 2/4 = 0.5
    expect(computeRevealFraction("2026-06-03", dates)).toBe(0.5);
  });

  it("returns 0.25 for the second date of a 5-day range", () => {
    // idx=1, totalDays=4 → 1/4 = 0.25
    expect(computeRevealFraction("2026-06-02", dates)).toBe(0.25);
  });

  it("returns 1 (show all) when scrubDate is not in the list", () => {
    expect(computeRevealFraction("2026-07-01", dates)).toBe(1);
  });

  it("handles a single-date scrubDates list without divide-by-zero", () => {
    // totalDays = max(0, 1) = 1; idx=0 → 0/1 = 0
    expect(computeRevealFraction("2026-06-01", ["2026-06-01"])).toBe(0);
  });
});

// ── getLocatedExpenses ────────────────────────────────────────────────────────

// Minimal expense stub — only fields needed for the filter
const makeExpense = (id: string, location: unknown): Expense =>
  ({
    id,
    location,
    groupId: "g1",
    paidByMemberId: "m1",
    description: "Test",
    category: "food",
    customCategory: null,
    amount: "100",
    currency: "INR",
    expenseDate: "2026-06-01",
    endDate: null,
    notes: null,
    isTemplate: false,
    isAdvance: false,
    recurrence: null,
    sourceTemplateId: null,
    createdByUserId: "u1",
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    receiptUrl: null,
    receiptItems: null,
    receiptScannedAt: null,
  } as unknown as Expense);

describe("getLocatedExpenses", () => {
  it("returns only expenses with a valid location object", () => {
    const expenses = [
      makeExpense("e1", { lat: 13.7, lng: 100.5, name: "Bangkok" }),
      makeExpense("e2", null),
      makeExpense("e3", { lat: 1.3, lng: 103.8, name: "Singapore" }),
    ];
    const result = getLocatedExpenses(expenses);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(["e1", "e3"]);
  });

  it("returns empty array when no expenses have location", () => {
    const expenses = [makeExpense("e1", null), makeExpense("e2", undefined)];
    expect(getLocatedExpenses(expenses)).toHaveLength(0);
  });

  it("returns empty array for an empty input", () => {
    expect(getLocatedExpenses([])).toHaveLength(0);
  });

  it("excludes expenses with malformed location (missing name)", () => {
    const expenses = [
      makeExpense("e1", { lat: 13.7, lng: 100.5 }), // missing name
      makeExpense("e2", { lat: 1.3, lng: 103.8, name: "Singapore" }),
    ];
    const result = getLocatedExpenses(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e2");
  });

  it("excludes expenses with location where lat is a string", () => {
    const expenses = [
      makeExpense("e1", { lat: "13.7", lng: 100.5, name: "Place" }), // lat is string
    ];
    expect(getLocatedExpenses(expenses)).toHaveLength(0);
  });
});
