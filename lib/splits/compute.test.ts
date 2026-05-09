import { describe, it, expect } from "vitest";
import {
  computeEqual,
  computeExact,
  computePercentage,
  computeShares,
  computeSplits,
} from "./compute";

const ids = ["a", "b", "c", "d", "e"];

describe("computeEqual", () => {
  it("splits evenly between 2 members", () => {
    const splits = computeEqual(100, ["a", "b"]);
    expect(splits).toHaveLength(2);
    expect(splits[0].shareAmount).toBe(50);
    expect(splits[1].shareAmount).toBe(50);
  });

  it("distributes rounding remainder to first member", () => {
    // 100 / 3 = 33.33... → first gets 33.34
    const splits = computeEqual(100, ["a", "b", "c"]);
    const sum = splits.reduce((acc, s) => acc + s.shareAmount, 0);
    expect(Math.round(sum * 100)).toBe(10000);
    expect(splits[0].shareAmount).toBe(33.34);
    expect(splits[1].shareAmount).toBe(33.33);
    expect(splits[2].shareAmount).toBe(33.33);
  });

  it("handles a single member", () => {
    const splits = computeEqual(250, ["a"]);
    expect(splits[0].shareAmount).toBe(250);
  });

  it("handles messy decimals", () => {
    const splits = computeEqual(99.99, ["a", "b", "c"]);
    const sum = splits.reduce((acc, s) => acc + s.shareAmount, 0);
    expect(Math.round(sum * 100)).toBe(9999);
  });
});

describe("computeExact", () => {
  it("accepts when amounts sum correctly", () => {
    const result = computeExact(150, [
      { memberId: "a", value: 50 },
      { memberId: "b", value: 100 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.splits[0].shareAmount).toBe(50);
      expect(result.splits[1].shareAmount).toBe(100);
    }
  });

  it("rejects when amounts don't match total", () => {
    const result = computeExact(150, [
      { memberId: "a", value: 50 },
      { memberId: "b", value: 80 },
    ]);
    expect(result.ok).toBe(false);
  });
});

describe("computePercentage", () => {
  it("splits by percentage", () => {
    const result = computePercentage(200, [
      { memberId: "a", value: 25 },
      { memberId: "b", value: 75 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.splits[0].shareAmount).toBe(50);
      expect(result.splits[1].shareAmount).toBe(150);
    }
  });

  it("rejects when percentages don't sum to 100", () => {
    const result = computePercentage(200, [
      { memberId: "a", value: 40 },
      { memberId: "b", value: 40 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("handles rounding on messy percentages", () => {
    // 33.33% each — won't divide cleanly
    const result = computePercentage(100, [
      { memberId: "a", value: 33.34 },
      { memberId: "b", value: 33.33 },
      { memberId: "c", value: 33.33 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sum = result.splits.reduce((acc, s) => acc + s.shareAmount, 0);
      expect(Math.round(sum * 100)).toBe(10000);
    }
  });
});

describe("computeShares", () => {
  it("splits by share weight", () => {
    // a gets 2 shares, b gets 1 — so a=66.67, b=33.33
    const result = computeShares(100, [
      { memberId: "a", value: 2 },
      { memberId: "b", value: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.splits[0].shareAmount).toBe(66.67);
      expect(result.splits[1].shareAmount).toBe(33.33);
    }
  });

  it("rejects zero total shares", () => {
    const result = computeShares(100, [
      { memberId: "a", value: 0 },
      { memberId: "b", value: 0 },
    ]);
    expect(result.ok).toBe(false);
  });

  it("handles 5 members with unequal shares", () => {
    const result = computeShares(500, ids.map((id, i) => ({ memberId: id, value: i + 1 })));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sum = result.splits.reduce((acc, s) => acc + s.shareAmount, 0);
      expect(Math.round(sum * 100)).toBe(50000);
    }
  });
});

describe("computeSplits dispatcher", () => {
  it("routes equal mode", () => {
    const r = computeSplits("equal", 100, [{ memberId: "a" }, { memberId: "b" }]);
    expect(r.ok).toBe(true);
  });

  it("routes exact mode", () => {
    const r = computeSplits("exact", 100, [
      { memberId: "a", value: 60 },
      { memberId: "b", value: 40 },
    ]);
    expect(r.ok).toBe(true);
  });

  it("routes percentage mode", () => {
    const r = computeSplits("percentage", 100, [
      { memberId: "a", value: 50 },
      { memberId: "b", value: 50 },
    ]);
    expect(r.ok).toBe(true);
  });

  it("routes shares mode", () => {
    const r = computeSplits("shares", 100, [
      { memberId: "a", value: 1 },
      { memberId: "b", value: 1 },
    ]);
    expect(r.ok).toBe(true);
  });
});
