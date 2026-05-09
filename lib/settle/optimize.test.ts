import { describe, it, expect } from "vitest";
import { optimizeSettlements } from "./optimize";

/** Helper: total amount transferred in a solution */
function totalTransferred(txns: ReturnType<typeof optimizeSettlements>) {
  return txns.reduce((s, t) => s + t.amount, 0);
}

/** Helper: verify every creditor is fully repaid */
function verifySolution(
  balances: { memberId: string; net: number }[],
  txns: ReturnType<typeof optimizeSettlements>
) {
  const net: Record<string, number> = {};
  for (const b of balances) net[b.memberId] = Math.round(b.net * 100);
  for (const t of txns) {
    net[t.from] = (net[t.from] ?? 0) + Math.round(t.amount * 100);
    net[t.to]   = (net[t.to]   ?? 0) - Math.round(t.amount * 100);
  }
  for (const v of Object.values(net)) {
    expect(Math.abs(v)).toBeLessThanOrEqual(1); // allow 1 cent rounding
  }
}

describe("optimizeSettlements", () => {
  it("two people — A paid for B", () => {
    const balances = [
      { memberId: "A", net:  50 },
      { memberId: "B", net: -50 },
    ];
    const txns = optimizeSettlements(balances);
    expect(txns).toHaveLength(1);
    expect(txns[0]).toEqual({ from: "B", to: "A", amount: 50 });
    verifySolution(balances, txns);
  });

  it("three people — one paid for all", () => {
    // A paid 300 for A, B, C equally → B owes 100, C owes 100
    const balances = [
      { memberId: "A", net:  200 },
      { memberId: "B", net: -100 },
      { memberId: "C", net: -100 },
    ];
    const txns = optimizeSettlements(balances);
    expect(txns.length).toBeLessThanOrEqual(2);
    verifySolution(balances, txns);
  });

  it("five people with messy decimals", () => {
    const balances = [
      { memberId: "A", net:  133.33 },
      { memberId: "B", net:  -33.33 },
      { memberId: "C", net:  -33.33 },
      { memberId: "D", net:  -33.34 },
      { memberId: "E", net:   -33.33 },
    ];
    const txns = optimizeSettlements(balances);
    expect(txns.length).toBeLessThanOrEqual(4);
    verifySolution(balances, txns);
  });

  it("all equal splits — no transactions needed", () => {
    const balances = [
      { memberId: "A", net: 0 },
      { memberId: "B", net: 0 },
      { memberId: "C", net: 0 },
    ];
    const txns = optimizeSettlements(balances);
    expect(txns).toHaveLength(0);
  });

  it("complex multi-payer scenario", () => {
    // A paid 600 (net +400), B paid 200 (net +100), C owes 300, D owes 200
    const balances = [
      { memberId: "A", net:  400 },
      { memberId: "B", net:  100 },
      { memberId: "C", net: -300 },
      { memberId: "D", net: -200 },
    ];
    const txns = optimizeSettlements(balances);
    expect(txns.length).toBeLessThanOrEqual(3);
    verifySolution(balances, txns);
    // Total transferred should equal total owed
    expect(Math.round(totalTransferred(txns) * 100)).toBe(50000);
  });

  it("single payer for entire group of 5", () => {
    const balances = [
      { memberId: "A", net:  800 },
      { memberId: "B", net: -200 },
      { memberId: "C", net: -200 },
      { memberId: "D", net: -200 },
      { memberId: "E", net: -200 },
    ];
    const txns = optimizeSettlements(balances);
    expect(txns).toHaveLength(4); // exactly n-1 for single creditor
    verifySolution(balances, txns);
  });
});
