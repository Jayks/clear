export interface TourStep {
  /** CSS selector for the element to spotlight. null = centered welcome modal. */
  target: string | null;
  title: string;
  description: string;
  /** Route to navigate to before showing this step (used in Phase D). */
  page?: string;
}
