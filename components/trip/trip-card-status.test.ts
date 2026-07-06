// Round 16 fix #4: computeTripStatus was fed toISOString().slice(0,10) (UTC)
// — an IST user before 05:30 would see the trip's alive badge off by one day
// ("Day 3 of 5" a day early/late, or the wrong justReturned/lastDay branch).
// Switched to localDateString(); this test locks in behaviour and exercises
// the day-boundary case that motivated the fix.
import { describe, it, expect, vi, afterEach } from "vitest";
import { computeTripStatus } from "./trip-card";

describe("computeTripStatus", () => {
  afterEach(() => vi.useRealTimers());

  it("returns null when trip hasn't started", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    expect(computeTripStatus("2026-06-10", "2026-06-20")).toBeNull();
  });

  it("returns null when no startDate is set", () => {
    expect(computeTripStatus(null, null)).toBeNull();
  });

  it("returns active with Day X of Y for an ongoing trip", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 10, 0, 0));
    const status = computeTripStatus("2026-06-13", "2026-06-20");
    expect(status).toEqual({ type: "active", label: "Day 3 of 8", color: "text-cyan-300" });
  });

  it("returns lastDay on the trip's final day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 20, 10, 0, 0));
    const status = computeTripStatus("2026-06-13", "2026-06-20");
    expect(status?.type).toBe("lastDay");
  });

  it("returns justReturned within 7 days of trip end", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 25, 10, 0, 0)); // 5 days after 06-20
    const status = computeTripStatus("2026-06-13", "2026-06-20");
    expect(status?.type).toBe("justReturned");
  });

  it("returns null more than 7 days after trip end", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 10, 0, 0)); // 11 days after 06-20
    expect(computeTripStatus("2026-06-13", "2026-06-20")).toBeNull();
  });

  it("uses the LOCAL calendar date for the day boundary, not a UTC one", () => {
    // A moment where the local wall clock is already the trip's last day —
    // this is the exact scenario the toISOString() bug got wrong for a
    // UTC+ timezone (it would have read the day before instead).
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 20, 1, 0, 0)); // 1am local, still the 20th locally
    const status = computeTripStatus("2026-06-13", "2026-06-20");
    expect(status?.type).toBe("lastDay");
  });
});
