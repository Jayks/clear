import { describe, it, expect } from "vitest";
import { computeAllTripsInsights, type TripSummary } from "./all-trips-insights";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";

function makeSummary(overrides: Partial<TripSummary> = {}): TripSummary {
  return {
    tripId: crypto.randomUUID(),
    name: "Trip",
    totalSpend: 10000,
    expenseCount: 5,
    memberCount: 3,
    currency: "INR",
    startDate: "2026-01-01",
    endDate: "2026-01-05",
    ...overrides,
  };
}

const noMembers: GroupMember[] = [];
const noTrips: Group[] = [];

describe("computeAllTripsInsights — currency (audit fix)", () => {
  it("uses the explicit `currency` param for highlight formatting, not the first summary's currency", () => {
    // getAllTripsInsightsData now pre-filters `summaries` so only the dominant
    // currency's trips carry a non-zero totalSpend — but the FIRST summary in
    // the array (chronological order) might still be a $0 off-currency trip.
    // The `currency` param must be authoritative, not summaries[0].currency.
    const summaries = [
      makeSummary({ currency: "USD", totalSpend: 0, expenseCount: 0 }), // excluded, off-currency
      makeSummary({ currency: "INR", totalSpend: 20000 }),
    ];

    const result = computeAllTripsInsights({
      trips: noTrips,
      summaries,
      categoryTotals: { food: 20000 },
      allMembers: noMembers,
      currentUserId: "user-1",
      currency: "INR",
    });

    expect(result.currency).toBe("INR");
    // dailyPace highlight (or avgTripCost fallback) must format in INR (₹), not $
    const allText = result.highlights.map((h) => `${h.title} ${h.sub}`).join(" ");
    expect(allText).not.toMatch(/\$/);
  });

  it("never blends totalSpend across currencies — totalSpend reflects only what's in `summaries`", () => {
    // The caller (getAllTripsInsightsData) is responsible for zeroing out
    // off-currency trips before calling this function; verify the arithmetic
    // itself is a plain sum with no currency awareness of its own (that's by
    // design — filtering happens one layer up, this just sums what it's given).
    const summaries = [
      makeSummary({ currency: "USD", totalSpend: 999999 }),
      makeSummary({ currency: "INR", totalSpend: 5000 }),
    ];
    const result = computeAllTripsInsights({
      trips: noTrips,
      summaries,
      categoryTotals: {},
      allMembers: noMembers,
      currentUserId: "user-1",
      currency: "INR",
    });
    // Sums everything it's handed — this documents WHY the query layer must
    // pre-filter (see lib/db/queries/insights.ts getAllTripsInsightsData).
    expect(result.totalSpend).toBe(1004999);
  });

  it("falls back to summaries[0]'s currency when no explicit currency is passed", () => {
    const summaries = [makeSummary({ currency: "USD" })];
    const result = computeAllTripsInsights({
      trips: noTrips,
      summaries,
      categoryTotals: {},
      allMembers: noMembers,
      currentUserId: "user-1",
    });
    expect(result.currency).toBe("USD");
  });
});
