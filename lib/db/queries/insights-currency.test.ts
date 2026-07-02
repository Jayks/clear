// Integration test against the REAL dev database — the actual audit bug lived
// in the DB query layer (getAllTripsInsightsData failed to scope its SUM
// queries to a single currency), not in the pure computeAllTripsInsights
// function (see lib/insights/all-trips-insights.test.ts for that half).
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const TEST_USER_ID = crypto.randomUUID();

vi.mock("@/lib/db/queries/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/queries/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: TEST_USER_ID, user_metadata: {} }) as never),
  };
});

const { db } = await import("@/lib/db/client");
const { groups } = await import("@/lib/db/schema/groups");
const { groupMembers } = await import("@/lib/db/schema/group-members");
const { expenses } = await import("@/lib/db/schema/expenses");
const { getAllTripsInsightsData } = await import("@/lib/db/queries/insights");
const { eq, inArray } = await import("drizzle-orm");

describe("getAllTripsInsightsData — currency-blending fix (live-DB integration)", () => {
  const groupIds: string[] = [];

  beforeAll(async () => {
    // Two INR trips (dominant currency) + one USD trip with a huge total that
    // would massively skew totalSpend/avgTripCost/dailyPace if not excluded.
    for (const [name, currency, amount] of [
      ["INR Trip A (auto-cleaned)", "INR", "1000.00"],
      ["INR Trip B (auto-cleaned)", "INR", "2000.00"],
      ["USD Trip (auto-cleaned)", "USD", "999999.00"],
    ] as const) {
      const [group] = await db
        .insert(groups)
        .values({ name, groupType: "trip", defaultCurrency: currency, createdBy: TEST_USER_ID })
        .returning({ id: groups.id });
      groupIds.push(group.id);

      const [member] = await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: TEST_USER_ID, displayName: "Tester", role: "admin" })
        .returning({ id: groupMembers.id });

      await db.insert(expenses).values({
        groupId: group.id,
        paidByMemberId: member.id,
        description: "Test expense",
        category: "food",
        amount,
        currency,
        expenseDate: "2026-01-01",
        createdByUserId: TEST_USER_ID,
      });
    }
  });

  afterAll(async () => {
    if (groupIds.length > 0) await db.delete(groups).where(inArray(groups.id, groupIds));
  });

  it("only sums the dominant-currency (INR) trips — the USD trip never blends into totalSpend", async () => {
    const insights = await getAllTripsInsightsData();
    expect(insights).not.toBeNull();
    expect(insights!.currency).toBe("INR");
    expect(insights!.totalSpend).toBe(3000); // 1000 + 2000, NOT +999999
    // The USD trip still counts toward the trip count (currency-agnostic stat)...
    expect(insights!.tripCount).toBe(3);
    // ...but contributes $0 to the per-trip breakdown, not its real (wrong-currency) total.
    const usdTripSummary = insights!.byTrip.find((t) => t.currency === "USD");
    expect(usdTripSummary?.totalSpend).toBe(0);
  });
});
