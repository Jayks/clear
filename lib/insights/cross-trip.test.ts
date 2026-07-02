import { describe, it, expect } from "vitest";
import { computeCrossTripInsights, type OtherTripSummary } from "./cross-trip";

function makeOther(overrides: Partial<OtherTripSummary> = {}): OtherTripSummary {
  return {
    tripId: crypto.randomUUID(),
    totalSpend: 10000,
    memberCount: 4,
    startDate: "2026-01-01",
    endDate: "2026-01-05",
    currency: "INR",
    categoryTotals: { food: 6000, transport: 4000 },
    ...overrides,
  };
}

describe("computeCrossTripInsights — currency filtering (audit fix)", () => {
  const baseCurrent = {
    totalSpend: 12000,
    memberCount: 4,
    tripDays: 5,
    currency: "INR",
    topCategory: "food",
    topCategoryPct: 50,
    perPersonDaily: 600,
  };

  it("excludes other-currency trips from the per-person/day average, ranking, and category comparison", () => {
    const sameCurrency = makeOther({ totalSpend: 8000, currency: "INR" });
    const foreignCurrency = makeOther({
      totalSpend: 999999, // would massively skew ranking/avg if not filtered out
      currency: "USD",
      categoryTotals: { shopping: 999999 },
    });

    const withForeign = computeCrossTripInsights({
      current: baseCurrent,
      others: [sameCurrency, foreignCurrency],
    });
    const withoutForeign = computeCrossTripInsights({
      current: baseCurrent,
      others: [sameCurrency],
    });

    // Including the foreign-currency trip must produce IDENTICAL results to
    // excluding it entirely — proof it was filtered out, not blended in.
    expect(withForeign).toEqual(withoutForeign);
  });

  it("returns no insights when every other trip is in a different currency", () => {
    const onlyForeign = [makeOther({ currency: "USD" }), makeOther({ currency: "EUR" })];
    const result = computeCrossTripInsights({ current: baseCurrent, others: onlyForeign });
    expect(result).toEqual([]);
  });

  it("still produces insights when at least one other trip shares the current currency", () => {
    const mixed = [makeOther({ currency: "INR" }), makeOther({ currency: "USD" })];
    const result = computeCrossTripInsights({ current: baseCurrent, others: mixed });
    expect(result.length).toBeGreaterThan(0);
  });
});
