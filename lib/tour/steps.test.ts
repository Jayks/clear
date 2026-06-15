import { describe, it, expect } from "vitest";
import { getTourSteps } from "./steps";

// Anchors known to exist in the current code — guards against the stale-anchor
// rot that broke the old tour (trip-card-add-btn / demo-nav-sheet / timeline).
const VALID_TARGETS = new Set([
  "[data-tour='demo-trip']",
  "[data-tour='trip-quick-actions']",
  "[data-tour='expense-list-header']",
  "[data-tour='debt-flow-graph']",
  "[data-tour='insights-charts']",
]);

describe("getTourSteps", () => {
  it("returns only the welcome step when there's no demo trip", () => {
    const steps = getTourSteps(null);
    expect(steps).toHaveLength(1);
    expect(steps[0].target).toBeNull();
  });

  it("returns a 7-step linear tour for a demo trip", () => {
    const steps = getTourSteps("abc-123");
    expect(steps).toHaveLength(7);
    expect(steps[0].target).toBeNull(); // welcome
  });

  it("every targeted step points at an anchor that exists", () => {
    for (const s of getTourSteps("abc-123")) {
      if (s.target !== null) expect(VALID_TARGETS.has(s.target)).toBe(true);
    }
  });

  it("inner-page steps navigate under the demo trip", () => {
    const steps = getTourSteps("abc-123");
    const pages = steps.map((s) => s.page).filter(Boolean);
    expect(pages).toContain("/groups");
    expect(pages).toContain("/groups/abc-123");
    expect(pages).toContain("/groups/abc-123/expenses");
    expect(pages).toContain("/groups/abc-123/settle");
    expect(pages).toContain("/groups/abc-123/insights");
  });

  it("has exactly one quick-add legend and one views legend", () => {
    const steps = getTourSteps("abc-123");
    expect(steps.filter((s) => s.quickAddLegend)).toHaveLength(1);
    expect(steps.filter((s) => s.viewsLegend)).toHaveLength(1);
  });

  it("flags steps inside the demo as sample data", () => {
    const steps = getTourSteps("abc-123");
    // every step except the welcome is inside the sample
    expect(steps.slice(1).every((s) => s.isSampleData)).toBe(true);
  });
});
