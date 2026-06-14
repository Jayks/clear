import { describe, it, expect } from "vitest";
import { computeHomeBalanceSummary, type HomeGroupMeta } from "./balance-summary";
import type { HomeBalanceEntry } from "../db/queries/balances";

// ── builders ──────────────────────────────────────────────────────────────────
const entry = (over: Partial<HomeBalanceEntry> = {}): HomeBalanceEntry => ({
  net: 0,
  hasMixedCurrencies: false,
  hasExpenses: true,
  currency: "INR",
  ...over,
});

const meta = (
  id: string,
  name: string,
  groupType: HomeGroupMeta["groupType"] = "trip",
  isDemo = false,
): HomeGroupMeta => ({ id, name, groupType, isDemo });

describe("computeHomeBalanceSummary", () => {
  // ── state: new ──────────────────────────────────────────────────────────────
  it("returns 'new' for empty inputs", () => {
    const s = computeHomeBalanceSummary({}, []);
    expect(s.state).toBe("new");
    expect(s.rows).toEqual([]);
    expect(s.groupsWithBalance).toBe(0);
  });

  it("returns 'new' when no eligible group has any expenses", () => {
    const s = computeHomeBalanceSummary(
      { a: entry({ hasExpenses: false }), b: entry({ hasExpenses: false }) },
      [meta("a", "Trip A"), meta("b", "Nest B", "nest")],
    );
    expect(s.state).toBe("new");
  });

  it("returns 'new' when only the demo group has activity (demo excluded)", () => {
    const s = computeHomeBalanceSummary(
      { demo: entry({ net: 5000, hasExpenses: true }) },
      [meta("demo", "Goa Sample", "trip", true)],
    );
    expect(s.state).toBe("new");
  });

  // ── state: settled ──────────────────────────────────────────────────────────
  it("returns 'settled' when there is activity but every net is zero", () => {
    const s = computeHomeBalanceSummary(
      { a: entry({ net: 0 }), b: entry({ net: 0 }) },
      [meta("a", "Trip A"), meta("b", "Nest B", "nest")],
    );
    expect(s.state).toBe("settled");
    expect(s.totalOwed).toBe(0);
    expect(s.totalOwe).toBe(0);
    expect(s.rows).toEqual([]);
  });

  // ── state: active ───────────────────────────────────────────────────────────
  it("single owed group", () => {
    const s = computeHomeBalanceSummary({ a: entry({ net: 2100 }) }, [meta("a", "Goa Trip")]);
    expect(s.state).toBe("active");
    expect(s.totalOwed).toBe(2100);
    expect(s.totalOwe).toBe(0);
    expect(s.currency).toBe("INR");
    expect(s.groupsWithBalance).toBe(1);
    expect(s.rows[0]).toMatchObject({ groupId: "a", name: "Goa Trip", net: 2100 });
  });

  it("single owing group", () => {
    const s = computeHomeBalanceSummary({ a: entry({ net: -900 }) }, [meta("a", "Flat", "nest")]);
    expect(s.state).toBe("active");
    expect(s.totalOwed).toBe(0);
    expect(s.totalOwe).toBe(900);
  });

  it("aggregates mixed directions across several groups", () => {
    const s = computeHomeBalanceSummary(
      {
        a: entry({ net: 2100 }),
        b: entry({ net: 2100 }),
        c: entry({ net: -900 }),
      },
      [meta("a", "Goa"), meta("b", "Ski"), meta("c", "Flat", "nest")],
    );
    expect(s.totalOwed).toBe(4200);
    expect(s.totalOwe).toBe(900);
    expect(s.groupsWithBalance).toBe(3);
  });

  // ── exclusions ──────────────────────────────────────────────────────────────
  it("excludes demo groups from totals and rows", () => {
    const s = computeHomeBalanceSummary(
      { demo: entry({ net: 5000 }), real: entry({ net: 2100 }) },
      [meta("demo", "Sample", "trip", true), meta("real", "Goa")],
    );
    expect(s.totalOwed).toBe(2100);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].groupId).toBe("real");
  });

  it("excludes circles entirely (wallet model has no per-user debt)", () => {
    const s = computeHomeBalanceSummary(
      { circle: entry({ net: 3000 }), trip: entry({ net: 2100 }) },
      [meta("circle", "Diwali Pool", "circle"), meta("trip", "Goa")],
    );
    expect(s.totalOwed).toBe(2100);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].groupId).toBe("trip");
  });

  it("excludes multi-currency groups from totals but still counts them as activity", () => {
    const s = computeHomeBalanceSummary(
      {
        mixed: entry({ net: 5000, hasMixedCurrencies: true }),
        clean: entry({ net: 2100 }),
      },
      [meta("mixed", "Europe"), meta("clean", "Goa")],
    );
    expect(s.state).toBe("active");
    expect(s.totalOwed).toBe(2100); // mixed group's 5000 not counted
    expect(s.rows).toHaveLength(1);
    expect(s.otherCurrencyCount).toBe(0); // mixed group isn't a "currency bucket"
  });

  it("is 'settled' when the only non-zero net lives in a multi-currency group", () => {
    const s = computeHomeBalanceSummary(
      {
        mixed: entry({ net: 5000, hasMixedCurrencies: true }),
        clean: entry({ net: 0 }),
      },
      [meta("mixed", "Europe"), meta("clean", "Goa")],
    );
    expect(s.state).toBe("settled");
  });

  it("ignores groups present in entries but absent from the meta list", () => {
    const s = computeHomeBalanceSummary(
      { a: entry({ net: 2100 }), ghost: entry({ net: 9999 }) },
      [meta("a", "Goa")],
    );
    expect(s.totalOwed).toBe(2100);
    expect(s.rows).toHaveLength(1);
  });

  it("skips groups in the meta list that have no balance entry", () => {
    const s = computeHomeBalanceSummary({ a: entry({ net: 2100 }) }, [
      meta("a", "Goa"),
      meta("missing", "No Data"),
    ]);
    expect(s.rows).toHaveLength(1);
    expect(s.state).toBe("active");
  });

  // ── multi-currency dominance ────────────────────────────────────────────────
  it("picks the dominant currency by gross volume and counts the rest", () => {
    const s = computeHomeBalanceSummary(
      {
        a: entry({ net: 2100, currency: "INR" }),
        b: entry({ net: -600, currency: "INR" }),
        c: entry({ net: 50, currency: "USD" }),
      },
      [meta("a", "Goa"), meta("b", "Flat", "nest"), meta("c", "NYC")],
    );
    expect(s.currency).toBe("INR");
    expect(s.totalOwed).toBe(2100);
    expect(s.totalOwe).toBe(600);
    expect(s.otherCurrencyCount).toBe(1);
    expect(s.rows.every((r) => r.currency === "INR")).toBe(true);
    expect(s.rows).toHaveLength(2); // USD row excluded
  });

  it("dominance is by volume, not group count", () => {
    const s = computeHomeBalanceSummary(
      {
        big: entry({ net: 10000, currency: "INR" }),
        u1: entry({ net: 50, currency: "USD" }),
        u2: entry({ net: 50, currency: "USD" }),
      },
      [meta("big", "Goa"), meta("u1", "NYC"), meta("u2", "LA")],
    );
    expect(s.currency).toBe("INR"); // 10000 gross beats 2 USD groups
    expect(s.otherCurrencyCount).toBe(1);
  });

  // ── ordering & rounding ─────────────────────────────────────────────────────
  it("sorts rows by absolute net desc, tie-break by name asc", () => {
    const s = computeHomeBalanceSummary(
      {
        z: entry({ net: 100 }),
        a: entry({ net: -300 }),
        b: entry({ net: 300 }),
      },
      [meta("z", "Zebra"), meta("a", "Alpha"), meta("b", "Beta")],
    );
    expect(s.rows.map((r) => r.name)).toEqual(["Alpha", "Beta", "Zebra"]);
  });

  it("rounds floating-point sums to 2 decimals", () => {
    const s = computeHomeBalanceSummary(
      { a: entry({ net: 0.1 }), b: entry({ net: 0.2 }) },
      [meta("a", "A"), meta("b", "B")],
    );
    expect(s.totalOwed).toBe(0.3);
  });

  it("counts only non-zero groups toward groupsWithBalance", () => {
    const s = computeHomeBalanceSummary(
      { a: entry({ net: 2100 }), b: entry({ net: 0 }) },
      [meta("a", "Goa"), meta("b", "Flat", "nest")],
    );
    expect(s.state).toBe("active");
    expect(s.groupsWithBalance).toBe(1);
  });
});
