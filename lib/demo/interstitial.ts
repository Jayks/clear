/**
 * Pure timing helper for the "loading your sample…" interstitial.
 *
 * The screen must stay up until BOTH are true:
 *  - the seed has finished, and
 *  - at least `minMs` has elapsed (so a tip is actually readable even when the
 *    seed returns near-instantly from a warm DB).
 *
 * Kept pure + DI'd (no Date.now/timers inside) so it's fully unit-testable.
 */
export function interstitialReady(
  seedDone: boolean,
  elapsedMs: number,
  minMs: number,
): boolean {
  return seedDone && elapsedMs >= minMs;
}

/**
 * Which tip to show given how long the interstitial has been up. Tips advance
 * every `intervalMs` and wrap around so the carousel never runs dry on a slow
 * seed. `count` must be > 0.
 */
export function tipIndexAt(elapsedMs: number, intervalMs: number, count: number): number {
  if (count <= 0) return 0;
  if (elapsedMs < 0 || intervalMs <= 0) return 0;
  return Math.floor(elapsedMs / intervalMs) % count;
}
