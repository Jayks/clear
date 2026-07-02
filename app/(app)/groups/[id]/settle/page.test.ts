// Verifies the audit fix: SettlePage now redirects Circle groups to the group
// overview instead of rendering a misleading balance view (circle wallet
// expenses have no expense_splits rows). Mocks every direct DB dependency so
// this stays a fast, deterministic unit test rather than a live-DB integration
// test — the fix under test is a single conditional redirect, not DB logic.
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("@/lib/db/queries/groups", () => ({
  getGroupWithMembers: vi.fn(),
}));
vi.mock("@/lib/db/queries/meta", () => ({ getGroupName: vi.fn(async () => "Test Group") }));
vi.mock("@/lib/db/queries/upi", () => ({ getMemberDefaultUpiIds: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/queries/settlements", () => ({ getPendingSettlements: vi.fn(async () => []) }));
vi.mock("@/lib/db/queries/payment-requests", () => ({ getPendingRequestsForGroup: vi.fn(async () => []) }));
vi.mock("@/lib/db/queries/auth", () => ({ getCurrentUser: vi.fn(async () => ({ id: "user-1" })) }));

const { getGroupWithMembers } = await import("@/lib/db/queries/groups");
const SettlePage = (await import("./page")).default;

const baseGroup = {
  id: "g1",
  name: "Test Group",
  defaultCurrency: "INR",
  shareToken: "tok-123",
};

describe("SettlePage — circle guard (audit fix)", () => {
  it("redirects Circle groups to the group overview instead of rendering", async () => {
    vi.mocked(getGroupWithMembers).mockResolvedValueOnce({
      group: { ...baseGroup, groupType: "circle", circleMode: "recurring" },
      members: [],
      currentMember: { id: "m1", role: "admin" },
    } as never);

    await expect(
      SettlePage({ params: Promise.resolve({ id: "g1" }), searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/groups/g1");
  });

  it("does NOT redirect Trip groups — renders normally", async () => {
    vi.mocked(getGroupWithMembers).mockResolvedValueOnce({
      group: { ...baseGroup, groupType: "trip", circleMode: null },
      members: [{ id: "m1", userId: "user-1", role: "admin" }],
      currentMember: { id: "m1", role: "admin" },
    } as never);

    const result = await SettlePage({ params: Promise.resolve({ id: "g1" }), searchParams: Promise.resolve({}) });
    expect(result).toBeDefined();
  });

  it("does NOT redirect Nest groups — renders normally", async () => {
    vi.mocked(getGroupWithMembers).mockResolvedValueOnce({
      group: { ...baseGroup, groupType: "nest", circleMode: null },
      members: [{ id: "m1", userId: "user-1", role: "admin" }],
      currentMember: { id: "m1", role: "admin" },
    } as never);

    const result = await SettlePage({ params: Promise.resolve({ id: "g1" }), searchParams: Promise.resolve({}) });
    expect(result).toBeDefined();
  });
});
