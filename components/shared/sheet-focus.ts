/**
 * Pure focus-trap decision logic for the Sheet primitive — extracted so the
 * wrap-around behaviour can be unit-tested without a DOM.
 *
 * Given the number of focusable elements inside the sheet, the index of the
 * currently-focused one (or -1 when focus is on the sheet container itself or has
 * escaped outside), and whether Shift is held, returns the index to focus next —
 * or `null` when the browser's native Tab handling already keeps focus inside the
 * sheet (so the handler should do nothing).
 */
export function resolveFocusTrap(
  count: number,
  activeIndex: number,
  shiftKey: boolean,
): number | null {
  if (count === 0) return null; // caller keeps focus on the container

  if (shiftKey) {
    // Moving backwards: wrap to the last element when at the first, on the
    // container, or escaped outside — otherwise let the browser step back.
    if (activeIndex <= 0) return count - 1;
    return null;
  }

  // Moving forwards: wrap to the first when at the last element; enter at the
  // first when focus is on the container/outside — otherwise let the browser step.
  if (activeIndex === count - 1) return 0;
  if (activeIndex === -1) return 0;
  return null;
}
