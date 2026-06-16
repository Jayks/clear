/**
 * Pure decision logic for the CountUp primitive — extracted so it can be
 * unit-tested without a DOM/animation environment.
 *
 * Rules:
 *  - First mount (`prev === null`) counts up from 0 → the entrance flourish.
 *  - A later value change animates `prev → value` → the meaningful delta of the
 *    user's action (logging ₹500 against a ₹2,000 debt reads 2000 → 1500, not 0 → 1500).
 *  - `prefers-reduced-motion` jumps straight to the value (no tween).
 *  - No change (a currency/duration-only re-render) does not animate.
 */
export function resolveCountUp(
  prev: number | null,
  value: number,
  reduceMotion: boolean,
): { from: number; animate: boolean } {
  if (reduceMotion) return { from: value, animate: false };
  const from = prev ?? 0; // first mount → 0 → value
  if (from === value) return { from: value, animate: false };
  return { from, animate: true };
}
