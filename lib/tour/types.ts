export interface TourStep {
  /** CSS selector for the element to spotlight. null = centered modal. */
  target: string | null;
  title: string;
  description: string;
  /** Route to navigate to before showing this step. */
  page?: string;
  /** Shows a "Sample data" badge — steps that point inside the demo group. */
  isSampleData?: boolean;
  /** Renders the Scan / Speak / Type quick-add legend in the popover body. */
  quickAddLegend?: boolean;
  /** Renders the filters + List / Timeline / Map views legend in the popover body. */
  viewsLegend?: boolean;
}
