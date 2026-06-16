import { describe, it, expect } from "vitest";
import { resolveFocusTrap } from "./sheet-focus";

describe("resolveFocusTrap", () => {
  // Forward (Tab)
  it("wraps to first when Tab is pressed on the last element", () => {
    expect(resolveFocusTrap(3, 2, false)).toBe(0);
  });

  it("lets the browser advance when Tab is pressed in the middle", () => {
    expect(resolveFocusTrap(3, 1, false)).toBeNull();
  });

  it("lets the browser advance from the first element", () => {
    expect(resolveFocusTrap(3, 0, false)).toBeNull();
  });

  it("enters at the first element when Tab is pressed on the container (-1)", () => {
    expect(resolveFocusTrap(3, -1, false)).toBe(0);
  });

  // Backward (Shift+Tab)
  it("wraps to last when Shift+Tab is pressed on the first element", () => {
    expect(resolveFocusTrap(3, 0, true)).toBe(2);
  });

  it("wraps to last when Shift+Tab is pressed on the container (-1) — keeps focus inside", () => {
    expect(resolveFocusTrap(3, -1, true)).toBe(2);
  });

  it("lets the browser step back from a middle element", () => {
    expect(resolveFocusTrap(3, 1, true)).toBeNull();
  });

  it("lets the browser step back from the last element", () => {
    expect(resolveFocusTrap(3, 2, true)).toBeNull();
  });

  // Single focusable element — Tab/Shift+Tab both stay put
  it("single element: Tab wraps to itself", () => {
    expect(resolveFocusTrap(1, 0, false)).toBe(0);
  });

  it("single element: Shift+Tab wraps to itself", () => {
    expect(resolveFocusTrap(1, 0, true)).toBe(0);
  });

  // No focusables — caller keeps focus on the container
  it("no focusables returns null for both directions", () => {
    expect(resolveFocusTrap(0, -1, false)).toBeNull();
    expect(resolveFocusTrap(0, -1, true)).toBeNull();
  });
});
