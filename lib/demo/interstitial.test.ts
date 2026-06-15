import { describe, it, expect } from "vitest";
import { interstitialReady, tipIndexAt } from "./interstitial";

describe("interstitialReady", () => {
  it("not ready while the seed is still running, regardless of time", () => {
    expect(interstitialReady(false, 5000, 3000)).toBe(false);
    expect(interstitialReady(false, 0, 3000)).toBe(false);
  });

  it("not ready when the seed is done but the minimum time hasn't elapsed", () => {
    expect(interstitialReady(true, 1200, 3000)).toBe(false);
  });

  it("ready when the seed is done AND the minimum time has elapsed", () => {
    expect(interstitialReady(true, 3000, 3000)).toBe(true); // exactly at the floor
    expect(interstitialReady(true, 8000, 3000)).toBe(true);
  });

  it("a slow seed gates readiness past the minimum", () => {
    // 10s elapsed, min 3s, but seed not done → still not ready
    expect(interstitialReady(false, 10000, 3000)).toBe(false);
    // seed finishes → now ready
    expect(interstitialReady(true, 10000, 3000)).toBe(true);
  });
});

describe("tipIndexAt", () => {
  it("starts at the first tip", () => {
    expect(tipIndexAt(0, 2500, 8)).toBe(0);
  });

  it("advances one tip per interval", () => {
    expect(tipIndexAt(2500, 2500, 8)).toBe(1);
    expect(tipIndexAt(5000, 2500, 8)).toBe(2);
    expect(tipIndexAt(6200, 2500, 8)).toBe(2); // mid-interval, still tip 2
  });

  it("wraps around so a long wait never runs dry", () => {
    expect(tipIndexAt(2500 * 8, 2500, 8)).toBe(0); // back to start after a full loop
    expect(tipIndexAt(2500 * 9, 2500, 8)).toBe(1);
  });

  it("guards against degenerate inputs", () => {
    expect(tipIndexAt(0, 2500, 0)).toBe(0);
    expect(tipIndexAt(-100, 2500, 8)).toBe(0);
    expect(tipIndexAt(1000, 0, 8)).toBe(0);
  });
});
