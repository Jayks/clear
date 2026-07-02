// Verifies the audit fix: the per-group insights page now redirects Circle
// groups to the group overview instead of treating them as a "trip" (the page
// only branches on `isNest`, so a circle would otherwise compute budget/pace/
// per-day metrics that don't apply to it).
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("@/lib/db/queries/groups", () => ({
  getGroupWithMembers: vi.fn(),
}));
vi.mock("@/lib/db/queries/expenses", () => ({
  getGroupExpensesWithSplits: vi.fn(async () => []),
}));
vi.mock("@/lib/db/queries/auth", () => ({ getCurrentUser: vi.fn(async () => ({ id: "user-1" })) }));

const { getGroupWithMembers } = await import("@/lib/db/queries/groups");
const GroupInsightsPage = (await import("./page")).default;

const baseGroup = {
  id: "g1",
  name: "Test Group",
  defaultCurrency: "INR",
  startDate: null,
  endDate: null,
  budget: null,
  itinerary: null,
  summaryToken: "tok-123",
};

describe("GroupInsightsPage — circle guard (audit fix)", () => {
  it("redirects Circle groups to the group overview instead of rendering", async () => {
    vi.mocked(getGroupWithMembers).mockResolvedValueOnce({
      group: { ...baseGroup, groupType: "circle", circleMode: "recurring" },
      members: [],
    } as never);

    await expect(
      GroupInsightsPage({ params: Promise.resolve({ id: "g1" }) }),
    ).rejects.toThrow("REDIRECT:/groups/g1");
  });

  it("does NOT redirect Trip groups — renders normally (empty state, no expenses)", async () => {
    vi.mocked(getGroupWithMembers).mockResolvedValueOnce({
      group: { ...baseGroup, groupType: "trip", circleMode: null },
      members: [{ id: "m1", userId: "user-1", role: "admin" }],
    } as never);

    const result = await GroupInsightsPage({ params: Promise.resolve({ id: "g1" }) });
    expect(result).toBeDefined();
  });

  it("does NOT redirect Nest groups — renders normally (empty state, no expenses)", async () => {
    vi.mocked(getGroupWithMembers).mockResolvedValueOnce({
      group: { ...baseGroup, groupType: "nest", circleMode: null },
      members: [{ id: "m1", userId: "user-1", role: "admin" }],
    } as never);

    const result = await GroupInsightsPage({ params: Promise.resolve({ id: "g1" }) });
    expect(result).toBeDefined();
  });
});
