/**
 * Haptic feedback utilities — thin wrappers around navigator.vibrate().
 * All functions are no-ops when the Vibration API is unavailable (iOS Safari, desktop).
 */

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

/** Short tap — expense saved, expense updated. */
export function hapticLight() {
  vibrate(50);
}

/** Double-pulse — settlement marked paid. */
export function hapticSuccess() {
  vibrate([30, 20, 50]);
}

/** Firm thud — item deleted. */
export function hapticDelete() {
  vibrate(80);
}
