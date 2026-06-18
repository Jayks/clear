import { describe, it, expect } from "vitest";
import { getPassAmountPaise } from "./pass";
import { EARLY_BIRD_PRICE, REGULAR_PRICE } from "../subscription/prices";

describe("getPassAmountPaise", () => {
  it("pass_30d, early bird: monthly early-bird price in paise", () => {
    expect(getPassAmountPaise("pass_30d", true)).toBe(EARLY_BIRD_PRICE.monthly * 100);
  });

  it("pass_30d, regular: monthly regular price in paise", () => {
    expect(getPassAmountPaise("pass_30d", false)).toBe(REGULAR_PRICE.monthly * 100);
  });

  it("annual, early bird: annual early-bird price in paise", () => {
    expect(getPassAmountPaise("annual", true)).toBe(EARLY_BIRD_PRICE.annual * 100);
  });

  it("annual, regular: annual regular price in paise", () => {
    expect(getPassAmountPaise("annual", false)).toBe(REGULAR_PRICE.annual * 100);
  });

  it("never returns a fractional paise amount (all listed prices are whole rupees)", () => {
    for (const passType of ["pass_30d", "annual"] as const) {
      for (const earlyBird of [true, false]) {
        expect(getPassAmountPaise(passType, earlyBird) % 1).toBe(0);
      }
    }
  });
});
