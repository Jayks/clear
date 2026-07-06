import { describe, it, expect } from "vitest";
import { isTripWrapUpDue, getSettleNudgeCopy, buildTripWrapUpNotification } from "./wrap-up";

describe("isTripWrapUpDue", () => {
  const today = "2026-07-03";

  it("returns false for a nest, even admin + archived + past end date", () => {
    expect(
      isTripWrapUpDue({ groupType: "nest", isAdmin: true, isArchived: true, endDate: "2026-06-01", today })
    ).toBe(false);
  });

  it("returns false for a non-admin trip past its end date", () => {
    expect(
      isTripWrapUpDue({ groupType: "trip", isAdmin: false, isArchived: false, endDate: "2026-06-01", today })
    ).toBe(false);
  });

  it("returns true for an admin trip that is archived (no end date)", () => {
    expect(
      isTripWrapUpDue({ groupType: "trip", isAdmin: true, isArchived: true, endDate: null, today })
    ).toBe(true);
  });

  it("returns true for an admin trip whose end date is before today", () => {
    expect(
      isTripWrapUpDue({ groupType: "trip", isAdmin: true, isArchived: false, endDate: "2026-06-01", today })
    ).toBe(true);
  });

  it("returns false when end date is exactly today (last day isn't over yet)", () => {
    expect(
      isTripWrapUpDue({ groupType: "trip", isAdmin: true, isArchived: false, endDate: today, today })
    ).toBe(false);
  });

  it("returns false for an admin trip whose end date is in the future", () => {
    expect(
      isTripWrapUpDue({ groupType: "trip", isAdmin: true, isArchived: false, endDate: "2026-12-01", today })
    ).toBe(false);
  });

  it("returns false for an admin trip with no end date and not archived", () => {
    expect(
      isTripWrapUpDue({ groupType: "trip", isAdmin: true, isArchived: false, endDate: null, today })
    ).toBe(false);
  });

  it("returns true when both archived AND end date has passed (OR doesn't double-fire/error)", () => {
    expect(
      isTripWrapUpDue({ groupType: "trip", isAdmin: true, isArchived: true, endDate: "2026-06-01", today })
    ).toBe(true);
  });
});

describe("getSettleNudgeCopy", () => {
  it("returns 'owed' copy for a positive net", () => {
    expect(getSettleNudgeCopy(450, "INR")).toBe("You're owed ₹450.00 for this trip");
  });

  it("returns 'owe' copy for a negative net, showing the magnitude not the sign", () => {
    expect(getSettleNudgeCopy(-450, "INR")).toBe("You owe ₹450.00 for this trip");
  });

  it("returns null for a settled (zero) net", () => {
    expect(getSettleNudgeCopy(0, "INR")).toBeNull();
  });

  it("returns null for a floating-point rounding artifact within the ±0.005 epsilon", () => {
    expect(getSettleNudgeCopy(0.001, "INR")).toBeNull();
    expect(getSettleNudgeCopy(-0.004, "INR")).toBeNull();
  });

  it("still returns real copy just outside the epsilon", () => {
    expect(getSettleNudgeCopy(0.01, "INR")).toBe("You're owed ₹0.01 for this trip");
  });

  it("formats using the group's currency, not a hardcoded one", () => {
    expect(getSettleNudgeCopy(100, "USD")).toBe("You're owed $100.00 for this trip");
  });
});

describe("buildTripWrapUpNotification", () => {
  const base = { userId: "user-1", groupId: "group-1", groupName: "Goa 2026" };

  it("returns the trip_wrapup type", () => {
    expect(buildTripWrapUpNotification(base).type).toBe("trip_wrapup");
  });

  it("dedupKey is scoped to BOTH the group and the user (Round 16 fix #13) so a second admin isn't silently starved by the global unique index", () => {
    expect(buildTripWrapUpNotification(base).dedupKey).toBe("trip_wrapup:group-1:user-1");
  });

  it("dedupKey differs for a different userId on the same group", () => {
    expect(buildTripWrapUpNotification({ ...base, userId: "user-2" }).dedupKey).toBe("trip_wrapup:group-1:user-2");
  });

  it("url deep-links to the group overview", () => {
    expect(buildTripWrapUpNotification(base).url).toBe("/groups/group-1");
  });

  it("body includes the actual trip name, not a placeholder", () => {
    expect(buildTripWrapUpNotification(base).body).toContain("Goa 2026");
  });

  it("passes the recipient userId through unchanged", () => {
    expect(buildTripWrapUpNotification(base).userId).toBe("user-1");
  });
});
