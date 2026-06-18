import { describe, it, expect } from "vitest";
import { extendEntitlement, PASS_DURATION_DAYS } from "./entitlement";

const NOW = new Date("2026-06-18T12:00:00Z");

describe("extendEntitlement", () => {
  it("fresh purchase (no existing entitlement): plusUntil = now + pass duration", () => {
    const result = extendEntitlement(null, "pass_30d", NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 30);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("fresh purchase, annual pass: plusUntil = now + 365 days", () => {
    const result = extendEntitlement(null, "annual", NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 365);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("stacks on remaining time when current entitlement is still in the future", () => {
    const current = new Date(NOW);
    current.setDate(current.getDate() + 10); // 10 days still remaining
    const result = extendEntitlement(current, "pass_30d", NOW);
    // base = current (still future) + 30 days, NOT now + 30
    const expected = new Date(current);
    expected.setDate(expected.getDate() + 30);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("expired-then-rebuy: treats a past plusUntil the same as null (extends from now)", () => {
    const expired = new Date(NOW);
    expired.setDate(expired.getDate() - 5); // lapsed 5 days ago
    const result = extendEntitlement(expired, "pass_30d", NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 30);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("entitlement expiring exactly now is treated as expired (base = now, not the stale value)", () => {
    const result = extendEntitlement(new Date(NOW), "pass_30d", NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 30);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("buying a second pass while already Plus stacks rather than resets", () => {
    // Bought a 30-day pass 20 days ago — 10 days remain.
    const tenDaysLeft = new Date(NOW);
    tenDaysLeft.setDate(tenDaysLeft.getDate() + 10);
    const afterFirst = tenDaysLeft;

    const afterSecond = extendEntitlement(afterFirst, "pass_30d", NOW);
    // Should be 40 days out from NOW (10 remaining + 30 new), not reset to 30.
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 40);
    expect(afterSecond.getTime()).toBe(expected.getTime());
  });

  it("PASS_DURATION_DAYS matches the documented pass products", () => {
    expect(PASS_DURATION_DAYS.pass_30d).toBe(30);
    expect(PASS_DURATION_DAYS.annual).toBe(365);
  });
});
