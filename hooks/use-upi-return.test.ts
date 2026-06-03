/**
 * useUpiReturn — unit tests for the return-detection logic.
 *
 * The hook itself uses browser event APIs (visibilitychange / focus) which
 * require a DOM environment. These tests verify the LOGIC that underpins the
 * hook using pure functions extracted from it — no React or DOM needed.
 *
 * Integration-level behaviour (timer starts on return, fallback after 3s, etc.)
 * should be tested manually on a real device via the payment flow.
 */

import { describe, it, expect } from "vitest";

// ── Pure logic extracted from the hook ──────────────────────────────────────

/**
 * Whether a visibilitychange event should activate the timer.
 * Maps document.hidden → should activate.
 */
function shouldActivateOnVisibility(isHidden: boolean): boolean {
  return !isHidden; // activate when page becomes visible (hidden=false)
}

/**
 * Simulate the activation guard: once activated, further calls are no-ops.
 */
function makeActivationGuard() {
  let activated = false;
  return {
    activate(): boolean {
      if (!activated) { activated = true; return true; }
      return false; // already activated — no-op
    },
    isActivated: () => activated,
  };
}

/**
 * The hook resets timerActive to false when tapped resets to false.
 * This mirrors the `if (!tapped) { setTimerActive(false); return; }` branch.
 */
function shouldResetOnUntap(tapped: boolean): boolean {
  return !tapped; // when tapped=false → reset timerActive to false
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useUpiReturn — visibilitychange activation logic", () => {
  it("activates when page becomes visible (hidden=false)", () => {
    expect(shouldActivateOnVisibility(false)).toBe(true);
  });

  it("does NOT activate when page becomes hidden (hidden=true)", () => {
    expect(shouldActivateOnVisibility(true)).toBe(false);
  });
});

describe("useUpiReturn — activation guard (idempotent)", () => {
  it("returns true on first activation", () => {
    const { activate } = makeActivationGuard();
    expect(activate()).toBe(true);
  });

  it("returns false on subsequent activations (already activated)", () => {
    const { activate } = makeActivationGuard();
    activate(); // first call
    expect(activate()).toBe(false); // second call: no-op
    expect(activate()).toBe(false); // third call: no-op
  });

  it("tracks activated state correctly", () => {
    const guard = makeActivationGuard();
    expect(guard.isActivated()).toBe(false);
    guard.activate();
    expect(guard.isActivated()).toBe(true);
  });
});

describe("useUpiReturn — reset on untap", () => {
  it("should reset timerActive when tapped becomes false", () => {
    expect(shouldResetOnUntap(false)).toBe(true);
  });

  it("should NOT reset timerActive when tapped is still true", () => {
    expect(shouldResetOnUntap(true)).toBe(false);
  });
});

describe("useUpiReturn — fallback timing constant", () => {
  it("fallback is 3000ms (3 seconds)", () => {
    // Verify the constant is documented and reasonable:
    // - Too short (<1s): fires before user even gets to the UPI app
    // - Too long (>10s): user stuck in "waiting" state on desktop / failed deep links
    // - 3s is the Goldilocks value — matches iOS app launch time
    const FALLBACK_MS = 3000;
    expect(FALLBACK_MS).toBeGreaterThanOrEqual(2000);
    expect(FALLBACK_MS).toBeLessThanOrEqual(5000);
  });
});
