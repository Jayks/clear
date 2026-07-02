/**
 * Pure state-transition logic for TourProvider.next() — extracted so the fix
 * for the "tour finish snaps back to the last step's page" bug is unit
 * testable without a React render harness.
 *
 * The bug: `next()` used to leave `active` untouched at the end of the tour,
 * relying only on `showCelebration`. A separate effect keeps the current URL
 * in sync with `steps[step].page` WHILE `active` is true — so navigating home
 * without also deactivating the tour let that effect immediately push back to
 * the last step's page once the URL changed. `active: false` must be part of
 * the SAME transition as `navigateHome: true`.
 */
export interface TourAdvanceResult {
  /** Next step index — unchanged when the tour is finishing. */
  step: number;
  /** Whether the tour should remain in its "on a step" state after this call. */
  active: boolean;
  /** Whether the caller should router.push("/groups"). */
  navigateHome: boolean;
  /** Whether the caller should schedule the celebration overlay. */
  celebrate: boolean;
}

export function computeNextTourState(step: number, totalSteps: number): TourAdvanceResult {
  if (step + 1 >= totalSteps) {
    return { step, active: false, navigateHome: true, celebrate: true };
  }
  return { step: step + 1, active: true, navigateHome: false, celebrate: false };
}
