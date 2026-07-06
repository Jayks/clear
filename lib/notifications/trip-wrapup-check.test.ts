// Round 16 fix #6: checkTripWrapUps now applies a 30-day recency guard on
// top of isTripWrapUpDue(), so the first deploy of this check doesn't fire a
// backfill notification for every long-ended trip in the DB at once.
// recordNotification is mocked so this stays a pure orchestration test (no DB).
import { describe, it, expect, vi, beforeEach } from "vitest";

const recordNotificationMock = vi.fn(async (_params: unknown) => {});
vi.mock("@/lib/notifications/record-notification", () => ({
  recordNotification: (params: unknown) => recordNotificationMock(params),
}));

const { checkTripWrapUps } = await import("./trip-wrapup-check");

describe("checkTripWrapUps — Round 16 fix #6 recency guard", () => {
  beforeEach(() => recordNotificationMock.mockClear());

  const today = "2026-07-06";

  it("fires for a trip that ended 5 days ago", async () => {
    await checkTripWrapUps(
      "user-1",
      [{ id: "g1", name: "Recent Trip", isArchived: false, endDate: "2026-07-01" }],
      today,
    );
    expect(recordNotificationMock).toHaveBeenCalledTimes(1);
  });

  it("skips a trip that ended 45 days ago", async () => {
    await checkTripWrapUps(
      "user-1",
      [{ id: "g1", name: "Old Trip", isArchived: false, endDate: "2026-05-22" }],
      today,
    );
    expect(recordNotificationMock).not.toHaveBeenCalled();
  });

  it("fires for an archived trip with no endDate regardless of age", async () => {
    await checkTripWrapUps(
      "user-1",
      [{ id: "g1", name: "Archived Undated Trip", isArchived: true, endDate: null }],
      today,
    );
    expect(recordNotificationMock).toHaveBeenCalledTimes(1);
  });

  it("boundary: exactly 30 days ago still fires (cutoff is inclusive)", async () => {
    // today - 30 days = 2026-06-06
    await checkTripWrapUps(
      "user-1",
      [{ id: "g1", name: "Boundary Trip", isArchived: false, endDate: "2026-06-06" }],
      today,
    );
    expect(recordNotificationMock).toHaveBeenCalledTimes(1);
  });

  it("boundary: 31 days ago is skipped", async () => {
    await checkTripWrapUps(
      "user-1",
      [{ id: "g1", name: "Just Over Trip", isArchived: false, endDate: "2026-06-05" }],
      today,
    );
    expect(recordNotificationMock).not.toHaveBeenCalled();
  });

  it("does not fire for a trip that isn't wrapped up at all (isTripWrapUpDue false)", async () => {
    await checkTripWrapUps(
      "user-1",
      [{ id: "g1", name: "Ongoing Trip", isArchived: false, endDate: "2026-12-01" }],
      today,
    );
    expect(recordNotificationMock).not.toHaveBeenCalled();
  });
});
