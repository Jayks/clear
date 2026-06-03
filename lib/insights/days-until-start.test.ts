/**
 * Tests for the daysUntilStart timezone-safe calculation (M-10 fix).
 *
 * Bug: `new Date("2026-06-05")` is parsed as UTC midnight. In IST (UTC+5:30),
 * that lands on 2026-06-05T05:30:00 local time, but `new Date(todayStr)` also
 * parses as UTC midnight. The difference is correct in UTC but wrong when the
 * server renders in a non-UTC timezone — it drifts ±1 day.
 *
 * Fix: append "T00:00:00" so both dates parse as **local** midnight:
 *   `new Date("2026-06-05T00:00:00")` → local midnight everywhere.
 */

import { describe, it, expect } from "vitest";

// ── Pure helper matching the fixed inline calculation in insights/page.tsx ──

function daysUntilStartFixed(startDate: string, todayStr: string): number {
  return Math.max(
    0,
    Math.ceil(
      (new Date(startDate + "T00:00:00").getTime() -
        new Date(todayStr + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
}

/** Old (buggy) calculation — parses YYYY-MM-DD as UTC midnight */
function daysUntilStartOld(startDate: string, todayStr: string): number {
  return Math.max(
    0,
    Math.ceil(
      (new Date(startDate).getTime() - new Date(todayStr).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
}

describe("daysUntilStart — M-10 timezone fix", () => {
  it("returns 0 when startDate equals today", () => {
    expect(daysUntilStartFixed("2026-07-15", "2026-07-15")).toBe(0);
  });

  it("returns 1 when trip starts tomorrow", () => {
    expect(daysUntilStartFixed("2026-07-16", "2026-07-15")).toBe(1);
  });

  it("returns 7 for a week away", () => {
    expect(daysUntilStartFixed("2026-07-22", "2026-07-15")).toBe(7);
  });

  it("never returns negative (trip already started)", () => {
    expect(daysUntilStartFixed("2026-07-10", "2026-07-15")).toBe(0);
  });

  it("handles month boundaries correctly", () => {
    // 5 days: Jun 28 → Jun 29 → Jun 30 → Jul 1 → Jul 2 → Jul 3
    expect(daysUntilStartFixed("2026-07-03", "2026-06-28")).toBe(5);
  });

  it("handles year boundaries correctly", () => {
    expect(daysUntilStartFixed("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("fixed version is consistent: both dates use same midnight reference", () => {
    // With T00:00:00, both dates are local-midnight → difference is always
    // an exact integer multiple of 86_400_000 ms → no fractional-day drift.
    const start = "2026-09-01";
    const today = "2026-08-25";
    const msPerDay = 1000 * 60 * 60 * 24;
    const rawMs =
      new Date(start + "T00:00:00").getTime() -
      new Date(today + "T00:00:00").getTime();
    expect(rawMs % msPerDay).toBe(0); // exact — no DST drift on same-zone dates
    expect(daysUntilStartFixed(start, today)).toBe(7);
  });

  it("old calculation matched fixed when both strings were identical (sanity check)", () => {
    // Both approaches agree when start and today are the same string
    expect(daysUntilStartOld("2026-07-15", "2026-07-15")).toBe(
      daysUntilStartFixed("2026-07-15", "2026-07-15"),
    );
  });
});

// ── UPI ID ordering tests (L-6 fix: promote newest default) ────────────────

/**
 * Simulates the logic in deleteUpiId: given a list of remaining UPI IDs sorted
 * by createdAt, pick the first one as the new default.
 *
 * Bug:  ORDER BY createdAt ASC → picks OLDEST (index 0 = most stale)
 * Fix:  ORDER BY createdAt DESC → picks NEWEST (index 0 = most recent)
 */

interface MockUpiId {
  id: string;
  createdAt: Date;
}

function pickNextDefault_OLD(remaining: MockUpiId[]): string | null {
  // Old: ascending sort → oldest first
  const sorted = [...remaining].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  return sorted[0]?.id ?? null;
}

function pickNextDefault_FIXED(remaining: MockUpiId[]): string | null {
  // Fixed: descending sort → newest first
  const sorted = [...remaining].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return sorted[0]?.id ?? null;
}

describe("deleteUpiId — L-6 promote newest VPA on default deletion", () => {
  const ids: MockUpiId[] = [
    { id: "old",    createdAt: new Date("2024-01-01") },
    { id: "middle", createdAt: new Date("2025-03-15") },
    { id: "newest", createdAt: new Date("2026-05-20") },
  ];

  it("FIXED: promotes newest remaining ID to default", () => {
    expect(pickNextDefault_FIXED(ids)).toBe("newest");
  });

  it("OLD (bug): promoted oldest ID — verifies the bug existed", () => {
    expect(pickNextDefault_OLD(ids)).toBe("old");
  });

  it("FIXED: returns null when no IDs remain", () => {
    expect(pickNextDefault_FIXED([])).toBeNull();
  });

  it("FIXED: works with a single remaining ID", () => {
    expect(pickNextDefault_FIXED([{ id: "solo", createdAt: new Date("2026-01-01") }])).toBe("solo");
  });

  it("FIXED: order is stable when timestamps differ by milliseconds", () => {
    const a = { id: "a", createdAt: new Date("2026-06-01T10:00:00.000Z") };
    const b = { id: "b", createdAt: new Date("2026-06-01T10:00:00.001Z") };
    expect(pickNextDefault_FIXED([a, b])).toBe("b"); // b is 1ms newer
  });
});
