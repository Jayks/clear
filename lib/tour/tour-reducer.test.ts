import { describe, it, expect } from "vitest";
import { computeNextTourState } from "./tour-reducer";

describe("computeNextTourState", () => {
  it("advances to the next step when not at the end", () => {
    const result = computeNextTourState(0, 4);
    expect(result).toEqual({ step: 1, active: true, navigateHome: false, celebrate: false });
  });

  it("advances through the middle steps", () => {
    const result = computeNextTourState(2, 4);
    expect(result).toEqual({ step: 3, active: true, navigateHome: false, celebrate: false });
  });

  it("finishing the last step deactivates the tour in the SAME transition as navigating home (audit fix)", () => {
    // This is the crux of the bug: `active: false` must appear alongside
    // `navigateHome: true` in one atomic result, not as two separate state
    // updates a caller could apply out of order or forget one of.
    const result = computeNextTourState(3, 4);
    expect(result.active).toBe(false);
    expect(result.navigateHome).toBe(true);
    expect(result.celebrate).toBe(true);
    expect(result.step).toBe(3); // step index unchanged — there is no step 4
  });

  it("works for a tour with only 1 step (finishes immediately)", () => {
    const result = computeNextTourState(0, 1);
    expect(result).toEqual({ step: 0, active: false, navigateHome: true, celebrate: true });
  });
});
