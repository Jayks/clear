import { describe, it, expect } from "vitest";
import { selectLockedGroups, isCurrentlyActiveTrip } from "./degradation";

const NOW = new Date("2026-06-18T12:00:00Z");

/** Helper: a Date `days` before NOW. */
function ago(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function group(id: string, daysAgo: number, isActiveTrip = false) {
  return { id, lastActiveAt: ago(daysAgo), isActiveTrip };
}

describe("selectLockedGroups", () => {
  it("Plus plan: never locks anything, regardless of count", () => {
    const groups = Array.from({ length: 10 }, (_, i) => group(`g${i}`, i));
    expect(selectLockedGroups(groups, "plus")).toEqual(new Set());
  });

  it("under cap: none locked", () => {
    const groups = [group("g1", 0), group("g2", 1), group("g3", 2)];
    expect(selectLockedGroups(groups, "free")).toEqual(new Set());
  });

  it("exactly at cap (5 groups): none locked", () => {
    const groups = [0, 1, 2, 3, 4].map((i) => group(`g${i}`, i));
    expect(selectLockedGroups(groups, "free")).toEqual(new Set());
  });

  it("over cap: the least-recently-active groups beyond the 5 most-recent are locked", () => {
    // g0..g4 are the 5 most recent (0-4 days ago); g5, g6 are older — should lock.
    const groups = [0, 1, 2, 3, 4, 5, 6].map((i) => group(`g${i}`, i));
    expect(selectLockedGroups(groups, "free")).toEqual(new Set(["g5", "g6"]));
  });

  it("active-trip grace: an old group that is a live trip is never locked", () => {
    // g6 would normally be locked (oldest), but it's an active trip — exempt.
    const groups = [
      group("g0", 0), group("g1", 1), group("g2", 2), group("g3", 3), group("g4", 4),
      group("g5", 5),
      group("g6", 100, true), // old but mid-journey
    ];
    const locked = selectLockedGroups(groups, "free");
    expect(locked.has("g6")).toBe(false);
    // g5 (the next-oldest non-exempt group) becomes the one that locks instead.
    expect(locked.has("g5")).toBe(true);
  });

  it("all-active-trips edge: no group locks even when every group is over cap and active", () => {
    const groups = Array.from({ length: 8 }, (_, i) => group(`g${i}`, i, true));
    expect(selectLockedGroups(groups, "free")).toEqual(new Set());
  });

  it("respects a custom cap", () => {
    const groups = [0, 1, 2].map((i) => group(`g${i}`, i));
    expect(selectLockedGroups(groups, "free", 2)).toEqual(new Set(["g2"]));
  });
});

describe("isCurrentlyActiveTrip", () => {
  it("true when today falls within a trip's start/end window", () => {
    expect(isCurrentlyActiveTrip("trip", "2026-06-15", "2026-06-20", NOW)).toBe(true);
  });

  it("true on the exact start day", () => {
    expect(isCurrentlyActiveTrip("trip", "2026-06-18", "2026-06-20", NOW)).toBe(true);
  });

  it("true on the exact end day", () => {
    expect(isCurrentlyActiveTrip("trip", "2026-06-15", "2026-06-18", NOW)).toBe(true);
  });

  it("false before the trip starts", () => {
    expect(isCurrentlyActiveTrip("trip", "2026-07-01", "2026-07-10", NOW)).toBe(false);
  });

  it("false after the trip has ended", () => {
    expect(isCurrentlyActiveTrip("trip", "2026-01-01", "2026-01-10", NOW)).toBe(false);
  });

  it("false when either date is missing — can't determine a window", () => {
    expect(isCurrentlyActiveTrip("trip", null, "2026-06-20", NOW)).toBe(false);
    expect(isCurrentlyActiveTrip("trip", "2026-06-15", null, NOW)).toBe(false);
    expect(isCurrentlyActiveTrip("trip", null, null, NOW)).toBe(false);
  });

  it("false for nests and circles even with dates somehow set", () => {
    expect(isCurrentlyActiveTrip("nest", "2026-06-15", "2026-06-20", NOW)).toBe(false);
    expect(isCurrentlyActiveTrip("circle", "2026-06-15", "2026-06-20", NOW)).toBe(false);
  });
});
