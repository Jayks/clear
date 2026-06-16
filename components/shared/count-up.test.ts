import { describe, it, expect } from "vitest";
import { resolveCountUp } from "./count-up-logic";

describe("resolveCountUp", () => {
  it("first mount (prev=null) counts up from 0 — the entrance flourish", () => {
    const r = resolveCountUp(null, 2000, false);
    expect(r).toEqual({ from: 0, animate: true });
  });

  it("first mount of a zero value does not animate (0 → 0)", () => {
    const r = resolveCountUp(null, 0, false);
    expect(r).toEqual({ from: 0, animate: false });
  });

  it("subsequent change animates from the previous value (the meaningful delta)", () => {
    // logging ₹500 against a ₹2,000 debt → 2000 → 1500, NOT 0 → 1500
    const r = resolveCountUp(2000, 1500, false);
    expect(r).toEqual({ from: 2000, animate: true });
  });

  it("animates upward from prev too (debt grows)", () => {
    const r = resolveCountUp(1500, 2000, false);
    expect(r).toEqual({ from: 1500, animate: true });
  });

  it("crossing zero animates from prev (owed → owe)", () => {
    const r = resolveCountUp(300, 200, false);
    expect(r).toEqual({ from: 300, animate: true });
  });

  it("no value change does not animate (e.g. a currency/duration-only re-render)", () => {
    const r = resolveCountUp(1500, 1500, false);
    expect(r).toEqual({ from: 1500, animate: false });
  });

  it("reduced motion jumps straight to the value on first mount", () => {
    const r = resolveCountUp(null, 2000, true);
    expect(r).toEqual({ from: 2000, animate: false });
  });

  it("reduced motion jumps straight to the value on a later change", () => {
    const r = resolveCountUp(2000, 1500, true);
    expect(r).toEqual({ from: 1500, animate: false });
  });
});
