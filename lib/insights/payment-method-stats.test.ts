/**
 * Payment method stats aggregation — unit tests.
 *
 * Tests the aggregation logic used in `getPersonalInsightsData` and
 * the `paymentMethodStats` field on `PersonalInsights`.
 */

import { describe, it, expect } from "vitest";

// ── Aggregation logic (mirrors lib/db/queries/insights.ts) ───────────────────

interface PaymentMethodRow {
  paymentMethod: string;
  total: string | null;
  cnt: string | null;
}

/** Aggregate payment method rows across multiple contexts (trip/nest/stream/circle) */
function aggregatePaymentMethodRows(rowGroups: PaymentMethodRow[][]): PaymentMethodRow[] {
  const totals = new Map<string, { total: number; cnt: number }>();
  for (const rows of rowGroups) {
    for (const row of rows) {
      if (!row.paymentMethod) continue;
      const existing = totals.get(row.paymentMethod) ?? { total: 0, cnt: 0 };
      totals.set(row.paymentMethod, {
        total: existing.total + Number(row.total ?? 0),
        cnt:   existing.cnt   + Number(row.cnt   ?? 0),
      });
    }
  }
  return [...totals.entries()].map(([paymentMethod, { total, cnt }]) => ({
    paymentMethod,
    total: String(total),
    cnt:   String(cnt),
  }));
}

/** Build final stats from raw rows (mirrors computePersonalInsights) */
function buildPaymentStats(rows: PaymentMethodRow[]) {
  return rows
    .filter((r) => r.paymentMethod && Number(r.total) > 0)
    .map((r) => ({
      method: r.paymentMethod,
      total:  Math.round(Number(r.total) * 100) / 100,
      count:  Number(r.cnt ?? 0),
    }))
    .sort((a, b) => b.total - a.total);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("aggregatePaymentMethodRows", () => {
  it("merges rows from multiple contexts by paymentMethod", () => {
    const tripRows:    PaymentMethodRow[] = [{ paymentMethod: "upi",  total: "1200", cnt: "2" }];
    const streamRows:  PaymentMethodRow[] = [{ paymentMethod: "upi",  total: "800",  cnt: "1" }];
    const circleRows:  PaymentMethodRow[] = [{ paymentMethod: "cash", total: "500",  cnt: "1" }];

    const result = aggregatePaymentMethodRows([tripRows, streamRows, circleRows]);
    const upi  = result.find((r) => r.paymentMethod === "upi");
    const cash = result.find((r) => r.paymentMethod === "cash");

    expect(upi?.total).toBe("2000");
    expect(upi?.cnt).toBe("3");
    expect(cash?.total).toBe("500");
    expect(cash?.cnt).toBe("1");
  });

  it("handles empty row groups gracefully", () => {
    const result = aggregatePaymentMethodRows([[], [], []]);
    expect(result).toHaveLength(0);
  });

  it("handles a single context with multiple methods", () => {
    const rows: PaymentMethodRow[] = [
      { paymentMethod: "upi",           total: "5000", cnt: "5" },
      { paymentMethod: "cash",          total: "1000", cnt: "2" },
      { paymentMethod: "bank_transfer", total: "2000", cnt: "1" },
    ];
    const result = aggregatePaymentMethodRows([rows]);
    expect(result).toHaveLength(3);
    const upiRow = result.find((r) => r.paymentMethod === "upi");
    expect(upiRow?.total).toBe("5000");
  });

  it("skips rows with null paymentMethod", () => {
    const rows: PaymentMethodRow[] = [
      { paymentMethod: "upi",  total: "100", cnt: "1" },
      // @ts-expect-error — testing null handling
      { paymentMethod: null,   total: "50",  cnt: "1" },
    ];
    const result = aggregatePaymentMethodRows([rows]);
    expect(result).toHaveLength(1);
    expect(result[0].paymentMethod).toBe("upi");
  });
});

describe("buildPaymentStats", () => {
  it("sorts by total descending (highest first)", () => {
    const rows: PaymentMethodRow[] = [
      { paymentMethod: "cash",          total: "500",  cnt: "2" },
      { paymentMethod: "upi",           total: "8000", cnt: "7" },
      { paymentMethod: "bank_transfer", total: "2000", cnt: "3" },
    ];
    const stats = buildPaymentStats(rows);
    expect(stats[0].method).toBe("upi");
    expect(stats[1].method).toBe("bank_transfer");
    expect(stats[2].method).toBe("cash");
  });

  it("filters out zero-total rows", () => {
    const rows: PaymentMethodRow[] = [
      { paymentMethod: "upi",  total: "1000", cnt: "2" },
      { paymentMethod: "cash", total: "0",    cnt: "0" },
    ];
    const stats = buildPaymentStats(rows);
    expect(stats).toHaveLength(1);
    expect(stats[0].method).toBe("upi");
  });

  it("rounds totals to 2 decimal places", () => {
    const rows: PaymentMethodRow[] = [
      { paymentMethod: "upi", total: "1234.567", cnt: "1" },
    ];
    const stats = buildPaymentStats(rows);
    expect(stats[0].total).toBe(1234.57);
  });

  it("returns empty array when all rows are zero", () => {
    const rows: PaymentMethodRow[] = [
      { paymentMethod: "upi",  total: "0", cnt: "0" },
      { paymentMethod: "cash", total: "0", cnt: "0" },
    ];
    const stats = buildPaymentStats(rows);
    expect(stats).toHaveLength(0);
  });

  it("correctly maps count to number", () => {
    const rows: PaymentMethodRow[] = [
      { paymentMethod: "upi", total: "5000", cnt: "12" },
    ];
    const stats = buildPaymentStats(rows);
    expect(stats[0].count).toBe(12);
    expect(typeof stats[0].count).toBe("number");
  });
});

describe("payment method stats — percentage calculation", () => {
  it("calculates correct percentages", () => {
    const stats = [
      { method: "upi",  total: 8000, count: 7 },
      { method: "cash", total: 2000, count: 3 },
    ];
    const grandTotal = stats.reduce((s, r) => s + r.total, 0); // 10000
    const upiPct  = Math.round((stats[0].total / grandTotal) * 100); // 80
    const cashPct = Math.round((stats[1].total / grandTotal) * 100); // 20
    expect(upiPct).toBe(80);
    expect(cashPct).toBe(20);
    expect(upiPct + cashPct).toBe(100);
  });

  it("handles single method (100%)", () => {
    const stats = [{ method: "upi", total: 5000, count: 5 }];
    const grandTotal = stats.reduce((s, r) => s + r.total, 0);
    const pct = Math.round((stats[0].total / grandTotal) * 100);
    expect(pct).toBe(100);
  });
});
