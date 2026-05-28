export interface TourStep {
  /** CSS selector for the element to spotlight. null = centered welcome modal. */
  target: string | null;
  title: string;
  description: string;
  /** Route to navigate to before showing this step. */
  page?: string;
  /** 'default' = first 4 steps (always shown). 'extended' = steps 5-7 (opt-in). */
  phase: "default" | "extended";
  /** Renders the nav sheet mini-legend in the popover body instead of description. */
  navLegend?: boolean;
  /** Shows a "Sample data" badge — used on extended steps inside the demo group. */
  isSampleData?: boolean;
  /** Tour auto-advances when [data-tour='quick-add-open'] appears in the DOM. */
  interactive?: boolean;
  /** Dispatches 'tour-switch-timeline-view' event to auto-switch ExpenseFilters to timeline mode. */
  autoTimeline?: boolean;
}
