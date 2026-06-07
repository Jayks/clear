/**
 * Phase 6 — Expense Map View: pure helper function tests
 *
 * Tests:
 *   isTripActive        — active-trip detection
 *   computeScrubDates   — scrubber date list (trip-range vs. expense-dates mode)
 *   computeRevealFraction — line-trim-offset fraction calculation
 *   getLocatedExpenses  — expense location filter
 *   getCategoryEmoji    — map-pin-chip category emoji lookup
 *   truncateAtWord      — word-boundary description truncation
 *   haversineDistanceKm / isSpreadOut — cross-location "spread out" detection
 *
 * Run with: pnpm test lib/receipt/phase6-map.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  isTripActive,
  computeScrubDates,
  computeRevealFraction,
  getLocatedExpenses,
  CATEGORY_EMOJI,
  CATEGORY_EMOJI_FALLBACK,
  getCategoryEmoji,
  truncateAtWord,
  haversineDistanceKm,
  isSpreadOut,
  SPREAD_OUT_THRESHOLD_KM,
} from "../expense/map-helpers";
import { CATEGORY_VALUES } from "../categories";
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

// ── getCategoryEmoji ──────────────────────────────────────────────────────────

describe("getCategoryEmoji", () => {
  it("returns the mapped emoji for a known category", () => {
    expect(getCategoryEmoji("food")).toBe("🍽");
    expect(getCategoryEmoji("accommodation")).toBe("🏨");
    expect(getCategoryEmoji("transport")).toBe("🚗");
  });

  it("returns the fallback emoji for an unknown category", () => {
    expect(getCategoryEmoji("not-a-real-category")).toBe(CATEGORY_EMOJI_FALLBACK);
  });

  it("returns the fallback emoji for null/undefined", () => {
    expect(getCategoryEmoji(null)).toBe(CATEGORY_EMOJI_FALLBACK);
    expect(getCategoryEmoji(undefined)).toBe(CATEGORY_EMOJI_FALLBACK);
  });

  it("maps every value in CATEGORY_VALUES to a real (non-fallback) emoji", () => {
    // Guards against future category additions silently falling back to 📍
    for (const cat of CATEGORY_VALUES) {
      expect(CATEGORY_EMOJI[cat], `missing CATEGORY_EMOJI entry for "${cat}"`).toBeDefined();
    }
  });
});

// ── truncateAtWord ────────────────────────────────────────────────────────────

describe("truncateAtWord", () => {
  it("returns short text unchanged", () => {
    expect(truncateAtWord("Lunch", 18)).toBe("Lunch");
  });

  it("returns text exactly at the limit unchanged", () => {
    const text = "Lunch at Saravana"; // 17 chars
    expect(truncateAtWord(text, 17)).toBe(text);
  });

  it("truncates at the last word boundary before the limit, never mid-word", () => {
    // "Lunch at Saravana Bhavan" sliced at 18 = "Lunch at Saravana " → cut at last space
    expect(truncateAtWord("Lunch at Saravana Bhavan", 18)).toBe("Lunch at Saravana…");
  });

  it("never produces an awkward mid-word cut like 'Lunch at Sa…'", () => {
    const result = truncateAtWord("Lunch at Saravana Bhavan", 12);
    expect(result).not.toMatch(/Sa…$/);
    expect(result).toBe("Lunch at…");
  });

  it("hard-cuts when there is no space to break on", () => {
    expect(truncateAtWord("Supercalifragilisticexpialidocious", 10)).toBe("Supercalif…");
  });

  it("trims surrounding whitespace before measuring", () => {
    expect(truncateAtWord("   Lunch   ", 18)).toBe("Lunch");
  });
});

// ── haversineDistanceKm ───────────────────────────────────────────────────────

describe("haversineDistanceKm", () => {
  it("returns ~0 for identical coordinates", () => {
    const p = { lat: 13.0827, lng: 80.2707 }; // Chennai
    expect(haversineDistanceKm(p, p)).toBeCloseTo(0, 5);
  });

  it("returns a small distance for two points in the same city", () => {
    // Two spots a few km apart within Chennai
    const a = { lat: 13.0827, lng: 80.2707 };
    const b = { lat: 13.0500, lng: 80.2121 };
    const d = haversineDistanceKm(a, b);
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(20);
  });

  it("returns a large distance between Chennai and Delhi (~1750km)", () => {
    const chennai = { lat: 13.0827, lng: 80.2707 };
    const delhi = { lat: 28.7041, lng: 77.1025 };
    const d = haversineDistanceKm(chennai, delhi);
    expect(d).toBeGreaterThan(1700);
    expect(d).toBeLessThan(1900);
  });

  it("is symmetric", () => {
    const a = { lat: 13.0827, lng: 80.2707 };
    const b = { lat: 28.7041, lng: 77.1025 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 9);
  });
});

// ── isSpreadOut ───────────────────────────────────────────────────────────────

describe("isSpreadOut", () => {
  it("returns false for an empty list", () => {
    expect(isSpreadOut([])).toBe(false);
  });

  it("returns false for a single location", () => {
    expect(isSpreadOut([{ lat: 13.0827, lng: 80.2707 }])).toBe(false);
  });

  it("returns false for same-city locations (within threshold)", () => {
    const locs = [
      { lat: 13.0827, lng: 80.2707 }, // Chennai spot A
      { lat: 13.0500, lng: 80.2121 }, // Chennai spot B, ~7km away
    ];
    expect(isSpreadOut(locs)).toBe(false);
  });

  it("returns true for cross-country locations (Chennai + Delhi)", () => {
    const locs = [
      { lat: 13.0827, lng: 80.2707 }, // Chennai
      { lat: 28.7041, lng: 77.1025 }, // Delhi
    ];
    expect(isSpreadOut(locs)).toBe(true);
  });

  it("returns true when ANY pair exceeds the threshold, even with close pairs present", () => {
    const locs = [
      { lat: 13.0827, lng: 80.2707 }, // Chennai
      { lat: 13.0500, lng: 80.2121 }, // Chennai (close to first)
      { lat: 28.7041, lng: 77.1025 }, // Delhi (far from both)
    ];
    expect(isSpreadOut(locs)).toBe(true);
  });

  it("respects SPREAD_OUT_THRESHOLD_KM as the cutoff", () => {
    // Two points roughly 1 degree of longitude apart at the equator-ish ≈ 111km apart — over threshold
    const farApart = [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }];
    expect(haversineDistanceKm(farApart[0], farApart[1])).toBeGreaterThan(SPREAD_OUT_THRESHOLD_KM);
    expect(isSpreadOut(farApart)).toBe(true);

    // Two points ~0.1 degree apart ≈ 11km — under threshold
    const close = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.1 }];
    expect(haversineDistanceKm(close[0], close[1])).toBeLessThan(SPREAD_OUT_THRESHOLD_KM);
    expect(isSpreadOut(close)).toBe(false);
  });
});
