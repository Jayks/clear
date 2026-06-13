import { describe, it, expect } from "vitest";
import {
  EARLY_BIRD_PRICE,
  REGULAR_PRICE,
  EARLY_BIRD_ANNUAL_MONTHLY_EQUIV,
  REGULAR_ANNUAL_MONTHLY_EQUIV,
  EARLY_BIRD_ANNUAL_SAVINGS,
  REGULAR_ANNUAL_SAVINGS,
} from "./prices";

describe("subscription prices (June 2026 model)", () => {
  it("uses the agreed Early Bird and Plus price points", () => {
    expect(EARLY_BIRD_PRICE).toEqual({ monthly: 49, annual: 499 });
    expect(REGULAR_PRICE).toEqual({ monthly: 79, annual: 699 });
  });

  it("early bird is strictly cheaper than regular Plus at both cycles", () => {
    expect(EARLY_BIRD_PRICE.monthly).toBeLessThan(REGULAR_PRICE.monthly);
    expect(EARLY_BIRD_PRICE.annual).toBeLessThan(REGULAR_PRICE.annual);
  });

  it("annual monthly-equivalents are floor(annual / 12)", () => {
    expect(EARLY_BIRD_ANNUAL_MONTHLY_EQUIV).toBe(Math.floor(499 / 12)); // 41
    expect(REGULAR_ANNUAL_MONTHLY_EQUIV).toBe(Math.floor(699 / 12)); // 58
  });

  it("annual savings are honest per-tier (vs that tier's own 12× monthly)", () => {
    expect(EARLY_BIRD_ANNUAL_SAVINGS).toBe(49 * 12 - 499); // 89
    expect(REGULAR_ANNUAL_SAVINGS).toBe(79 * 12 - 699); // 249
  });

  it("paying annually is always cheaper than 12× monthly (positive savings)", () => {
    expect(EARLY_BIRD_ANNUAL_SAVINGS).toBeGreaterThan(0);
    expect(REGULAR_ANNUAL_SAVINGS).toBeGreaterThan(0);
  });
});
