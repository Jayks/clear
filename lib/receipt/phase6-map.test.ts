/**
 * Phase 6 — Expense Map View: pure helper function tests
 *
 * Tests:
 *   isTripActive        — active-trip detection
 *   computeScrubDates   — scrubber date list (trip-range vs. expense-dates mode)
 *   computeDistanceRevealFraction — line-trim-offset fraction (distance-based)
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
  computeDistanceRevealFraction,
  computeDistanceRevealFractionThroughIndex,
  groupLocationsIntoStops,
  getLocatedExpenses,
  CATEGORY_EMOJI,
  CATEGORY_EMOJI_FALLBACK,
  getCategoryEmoji,
  truncateAtWord,
  haversineDistanceKm,
  isSpreadOut,
  SPREAD_OUT_THRESHOLD_KM,
  easeOutCubic,
  lerp,
  pointAlongLine,
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

// ── computeDistanceRevealFraction ─────────────────────────────────────────────
// Supersedes the old vertex-index-based computeRevealFraction, which silently
// desynced from Mapbox's actual (distance-based) line-trim-offset/line-progress
// rendering whenever days covered unequal distances — see its @deprecated note.

describe("computeDistanceRevealFraction", () => {
  // Chennai → Delhi is a huge leg (~1750km); Delhi → nearby suburb is tiny
  // (~30km). A vertex-index fraction would treat these as equal "shares" —
  // the whole point of this helper is that it must NOT.
  const chennai = { lat: 13.0827, lng: 80.2707, expenseDate: "2026-06-01" };
  const delhi   = { lat: 28.7041, lng: 77.1025, expenseDate: "2026-06-02" };
  const suburb  = { lat: 28.4595, lng: 77.0266, expenseDate: "2026-06-03" };
  const route   = [chennai, delhi, suburb];

  it("returns 1 (show all) when scrubDate is null", () => {
    expect(computeDistanceRevealFraction(null, route)).toBe(1);
  });

  it("returns 1 (show all) when fewer than 2 locations", () => {
    expect(computeDistanceRevealFraction("2026-06-01", [chennai])).toBe(1);
  });

  it("returns 0 for the first date — nothing travelled yet", () => {
    expect(computeDistanceRevealFraction("2026-06-01", route)).toBe(0);
  });

  it("returns 1 for the last date — full route revealed", () => {
    expect(computeDistanceRevealFraction("2026-06-03", route)).toBe(1);
  });

  it("returns ~0.98 for the middle date — NOT 0.5, because the first leg dominates the route by distance", () => {
    // This is the crux of the bug fix: a vertex-index fraction would say 0.5
    // (day 2 of 3 → idx 1 / totalDays 2). But by the END of day 2 (Delhi),
    // ~98% of the total route distance has already been covered — the
    // remaining Delhi→suburb hop is tiny by comparison. Revealing only half
    // the line at this point would cut the route off mid-Chennai-to-Delhi,
    // nowhere near the Delhi pin the scrubber is sitting on.
    const fraction = computeDistanceRevealFraction("2026-06-02", route);
    expect(fraction).toBeGreaterThan(0.95);
    expect(fraction).toBeLessThan(1);
  });

  it("returns 0 when scrubbed to a date before the route begins", () => {
    expect(computeDistanceRevealFraction("2026-05-01", route)).toBe(0);
  });

  it("reveals through the LAST matching waypoint when multiple share the scrubbed date", () => {
    const sameDayRoute = [
      { ...chennai, expenseDate: "2026-06-01" },
      { ...delhi,   expenseDate: "2026-06-01" },
      { ...suburb,  expenseDate: "2026-06-02" },
    ];
    // Both Chennai and Delhi fall on 06-01 — reveal should extend through
    // Delhi (the later waypoint that day), not stop at Chennai.
    const fraction = computeDistanceRevealFraction("2026-06-01", sameDayRoute);
    expect(fraction).toBeGreaterThan(0.95);
  });

  it("handles a zero-length route (identical coordinates) without divide-by-zero", () => {
    const samePoint = { lat: 13.08, lng: 80.27, expenseDate: "2026-06-01" };
    expect(
      computeDistanceRevealFraction("2026-06-01", [samePoint, { ...samePoint, expenseDate: "2026-06-02" }]),
    ).toBe(1);
  });

  it("never exceeds 1 even with floating-point accumulation across many segments", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      lat: 13 + i * 0.7,
      lng: 80 - i * 0.3,
      expenseDate: `2026-06-${String(i + 1).padStart(2, "0")}`,
    }));
    expect(computeDistanceRevealFraction("2026-06-12", many)).toBe(1);
  });
});

// ── computeDistanceRevealFractionThroughIndex ─────────────────────────────────
// Sub-day stepping — reveals "through waypoint N", not "through end of day X".
// The "day complete" sub-step (throughIndex = last waypoint of that day) MUST
// match `computeDistanceRevealFraction`'s result exactly, or the line visibly
// jumps the instant the one-by-one sequence finishes and hands off.

describe("computeDistanceRevealFractionThroughIndex", () => {
  const chennai = { lat: 13.0827, lng: 80.2707 };
  const delhi   = { lat: 28.7041, lng: 77.1025 };
  const suburb  = { lat: 28.4595, lng: 77.0266 };
  const route   = [chennai, delhi, suburb];

  it("returns 1 when fewer than 2 locations", () => {
    expect(computeDistanceRevealFractionThroughIndex(0, [chennai])).toBe(1);
  });

  it("returns 0 for a negative index — nothing revealed yet", () => {
    expect(computeDistanceRevealFractionThroughIndex(-1, route)).toBe(0);
  });

  it("returns 1 once the index reaches the last waypoint (or beyond)", () => {
    expect(computeDistanceRevealFractionThroughIndex(2, route)).toBe(1);
    expect(computeDistanceRevealFractionThroughIndex(99, route)).toBe(1);
  });

  it("matches computeDistanceRevealFraction at each date boundary — no hand-off jump", () => {
    const dated = [
      { ...chennai, expenseDate: "2026-06-01" },
      { ...delhi,   expenseDate: "2026-06-02" },
      { ...suburb,  expenseDate: "2026-06-03" },
    ];
    expect(computeDistanceRevealFractionThroughIndex(0, dated))
      .toBeCloseTo(computeDistanceRevealFraction("2026-06-01", dated), 10);
    expect(computeDistanceRevealFractionThroughIndex(1, dated))
      .toBeCloseTo(computeDistanceRevealFraction("2026-06-02", dated), 10);
    expect(computeDistanceRevealFractionThroughIndex(2, dated))
      .toBeCloseTo(computeDistanceRevealFraction("2026-06-03", dated), 10);
  });

  it("weights by distance, not by index — first leg dominates", () => {
    // Mirrors the date-based helper's "~0.98 not 0.5" crux: revealing through
    // waypoint 1 (Delhi) of 3 already covers ~98% of the total route distance.
    const fraction = computeDistanceRevealFractionThroughIndex(1, route);
    expect(fraction).toBeGreaterThan(0.95);
    expect(fraction).toBeLessThan(1);
  });

  it("returns 1 when every point is identical — nothing to reveal incrementally", () => {
    const samePoint = { lat: 28.7041, lng: 77.1025 };
    expect(computeDistanceRevealFractionThroughIndex(0, [samePoint, samePoint])).toBe(1);
  });
});

// ── groupLocationsIntoStops ───────────────────────────────────────────────────
// "The cluster should have different locations — only then does one-by-one
// stepping make sense." Same-coordinate expenses (three meals all logged at
// "Hotel Taj, Chennai") collapse into a single stop; the camera shouldn't hop
// to the identical spot three times in a row.

describe("groupLocationsIntoStops", () => {
  const taj      = { lat: 13.0827, lng: 80.2707, label: "taj-1" };
  const tajAgain = { lat: 13.0827, lng: 80.2707, label: "taj-2" };
  const marina   = { lat: 13.0500, lng: 80.2824, label: "marina" };
  const tnagar   = { lat: 13.0418, lng: 80.2341, label: "tnagar" };

  it("groups expenses sharing an exact coordinate into one stop", () => {
    const stops = groupLocationsIntoStops([taj, tajAgain]);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveLength(2);
  });

  it("keeps distinct coordinates as separate stops, in first-seen order", () => {
    const stops = groupLocationsIntoStops([taj, marina, tnagar]);
    expect(stops).toHaveLength(3);
    expect(stops.map((s) => s[0].label)).toEqual(["taj-1", "marina", "tnagar"]);
  });

  it("interleaves a repeat coordinate into its first group, not a new one", () => {
    // breakfast @ Taj, lunch @ Marina, dinner back @ Taj — should be 2 stops
    // (Taj, Marina), with both Taj visits grouped together, not 3 hops.
    const stops = groupLocationsIntoStops([taj, marina, tajAgain]);
    expect(stops).toHaveLength(2);
    expect(stops[0].map((l) => l.label)).toEqual(["taj-1", "taj-2"]);
    expect(stops[1].map((l) => l.label)).toEqual(["marina"]);
  });

  it("returns one single-item stop per location when all coordinates differ", () => {
    const stops = groupLocationsIntoStops([taj, marina, tnagar]);
    expect(stops.every((s) => s.length === 1)).toBe(true);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupLocationsIntoStops([])).toEqual([]);
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

// ── easeOutCubic ──────────────────────────────────────────────────────────────

describe("easeOutCubic", () => {
  it("returns 0 at t=0 and 1 at t=1 (anchors the animation range)", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("front-loads progress — past the midpoint before t=0.5 (ease-OUT shape)", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it("is monotonically increasing across the range", () => {
    const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map(easeOutCubic);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });

  it("clamps inputs outside [0, 1]", () => {
    expect(easeOutCubic(-0.5)).toBe(0);
    expect(easeOutCubic(1.5)).toBe(1);
  });
});

// ── lerp ──────────────────────────────────────────────────────────────────────

describe("lerp", () => {
  it("returns `from` at t=0 and `to` at t=1", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("returns the midpoint at t=0.5", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it("works when `to` is less than `from` (animating backwards)", () => {
    expect(lerp(1, 0, 0.25)).toBeCloseTo(0.75);
  });
});

// ── pointAlongLine ────────────────────────────────────────────────────────────

describe("pointAlongLine", () => {
  it("returns null for fewer than 2 points", () => {
    expect(pointAlongLine([], 0.5)).toBeNull();
    expect(pointAlongLine([{ lat: 13, lng: 80 }], 0.5)).toBeNull();
  });

  it("returns the start point at fraction 0 and the end point at fraction 1", () => {
    const locs = [
      { lat: 13.0827, lng: 80.2707 }, // Chennai
      { lat: 28.7041, lng: 77.1025 }, // Delhi
    ];
    expect(pointAlongLine(locs, 0)).toEqual(locs[0]);
    expect(pointAlongLine(locs, 1)).toEqual(locs[1]);
  });

  it("returns the midpoint of a two-point line at fraction 0.5", () => {
    const locs = [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }];
    const mid = pointAlongLine(locs, 0.5)!;
    expect(mid.lat).toBeCloseTo(0);
    expect(mid.lng).toBeCloseTo(5);
  });

  it("returns the same point when all locations are identical (nowhere to walk)", () => {
    const locs = [{ lat: 13, lng: 80 }, { lat: 13, lng: 80 }, { lat: 13, lng: 80 }];
    expect(pointAlongLine(locs, 0.5)).toEqual({ lat: 13, lng: 80 });
  });

  it("clamps fractions outside [0, 1]", () => {
    const locs = [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }];
    expect(pointAlongLine(locs, -0.5)).toEqual(pointAlongLine(locs, 0));
    expect(pointAlongLine(locs, 1.5)).toEqual(pointAlongLine(locs, 1));
  });

  it("paces by cumulative DISTANCE, not by waypoint count — a long first leg dominates the early fraction range", () => {
    // Leg 1 (Chennai → Delhi) is ~1750km; leg 2 (Delhi → nearby suburb) is ~10km.
    // Total ≈ 1760km. At fraction 0.9 (≈1584km walked), we should still be
    // partway down leg 1 — NOT already past the second waypoint, which a
    // naive "2 waypoints → switch legs at 0.5" approach would produce.
    const chennai = { lat: 13.0827, lng: 80.2707 };
    const delhi   = { lat: 28.7041, lng: 77.1025 };
    const suburb  = { lat: 28.4595, lng: 77.0266 }; // Gurgaon-ish, close to Delhi
    const locs = [chennai, delhi, suburb];

    const at90pct = pointAlongLine(locs, 0.9)!;
    const legKm   = haversineDistanceKm(chennai, delhi);
    const distFromChennai = haversineDistanceKm(chennai, at90pct);
    // Should be well short of reaching Delhi yet (still on leg 1)
    expect(distFromChennai).toBeLessThan(legKm);
    expect(distFromChennai).toBeGreaterThan(legKm * 0.8);
  });

  it("interpolates linearly within a segment proportional to distance walked", () => {
    const locs = [{ lat: 0, lng: 0 }, { lat: 0, lng: 4 }, { lat: 0, lng: 10 }];
    // Segment 1 = 4° lng span, segment 2 = 6° lng span (total 10°, roughly
    // proportional to distance at the equator). Fraction 0.4 ≈ end of seg 1.
    const p = pointAlongLine(locs, 0.4)!;
    expect(p.lng).toBeCloseTo(4, 0);
  });
});
