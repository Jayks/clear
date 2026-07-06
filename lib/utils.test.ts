// Round 16 fix #4: client "today/yesterday" defaults were computed via
// toISOString() (UTC) — an IST user before 05:30 got yesterday pre-filled.
// localDateString()/localYesterdayString() compute against the local clock.
import { describe, it, expect, vi, afterEach } from "vitest";
import { localDateString, localYesterdayString, smartDefaultDate } from "./utils";

describe("localDateString", () => {
  it("formats a plain date as local yyyy-MM-dd", () => {
    expect(localDateString(new Date(2026, 5, 15))).toBe("2026-06-15"); // June (0-indexed month 5)
  });

  it("pads single-digit month and day", () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("handles a month boundary (last day of month)", () => {
    expect(localDateString(new Date(2026, 0, 31))).toBe("2026-01-31");
  });

  it("handles a year boundary (Dec 31 → Jan 1)", () => {
    expect(localDateString(new Date(2025, 11, 31))).toBe("2025-12-31");
    expect(localDateString(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("does NOT roll back a day the way toISOString() would for a UTC+ timezone", () => {
    // Simulate: local wall-clock time is 2026-06-15 01:00 in a UTC+5:30 zone.
    // A naive `new Date().toISOString().split("T")[0]` would read "2026-06-14"
    // (UTC is behind). localDateString must read the LOCAL calendar date.
    const localMidnightIsh = new Date(2026, 5, 15, 1, 0, 0); // constructed in local time
    expect(localDateString(localMidnightIsh)).toBe("2026-06-15");
  });
});

describe("localYesterdayString", () => {
  afterEach(() => vi.useRealTimers());

  it("returns the local calendar date one day before now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 10, 0, 0));
    expect(localYesterdayString()).toBe("2026-06-14");
  });

  it("crosses a month boundary correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 10, 0, 0)); // Jul 1
    expect(localYesterdayString()).toBe("2026-06-30");
  });

  it("crosses a year boundary correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0)); // Jan 1, 2026
    expect(localYesterdayString()).toBe("2025-12-31");
  });
});

describe("smartDefaultDate — behaviour unchanged after switching to localDateString internally", () => {
  afterEach(() => vi.useRealTimers());

  it("returns today when no trip dates are set", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 10, 0, 0));
    expect(smartDefaultDate(null, null)).toBe("2026-06-15");
  });

  it("returns the trip start date when the trip hasn't started yet", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 10, 0, 0));
    expect(smartDefaultDate("2026-07-01", "2026-07-10")).toBe("2026-07-01");
  });

  it("returns the trip start date (retroactive logging) when the trip has ended", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 10, 0, 0));
    expect(smartDefaultDate("2026-05-01", "2026-05-10")).toBe("2026-05-01");
  });

  it("returns today when the trip is ongoing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 10, 0, 0));
    expect(smartDefaultDate("2026-06-10", "2026-06-20")).toBe("2026-06-15");
  });
});
