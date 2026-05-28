import type { TourStep } from "./types";

export const DEFAULT_STEP_COUNT = 4;

export function getTourSteps(demoTripId: string | null): TourStep[] {
  const base = demoTripId ? `/groups/${demoTripId}` : null;

  const extendedSteps: TourStep[] = base
    ? [
        {
          target: "[data-tour='expense-list-header']",
          page: `${base}/expenses`,
          title: "Search and filter",
          description:
            "Every expense in one place — search by description or category, filter by payer or date, and sort any way you like.",
          phase: "extended",
          isSampleData: true,
        },
        {
          target: "[data-tour='expense-timeline-day1']",
          page: `${base}/expenses`,
          title: "Day-by-day timeline",
          description:
            "The timeline groups every expense by date — busiest days glow, category bars show the split at a glance. Great for a post-trip review.",
          phase: "extended",
          isSampleData: true,
          autoTimeline: true,
        },
        {
          target: "[data-tour='debt-flow-graph']",
          page: `${base}/settle`,
          title: "Debt flow graph",
          description:
            "Every debt mapped as a flow between members. Tap any arc to jump to the payment suggestion, or drag nodes to rearrange the layout.",
          phase: "extended",
          isSampleData: true,
        },
        {
          target: "[data-tour='insights-charts']",
          page: `${base}/insights`,
          title: "See where the money went",
          description:
            "Charts break down spending by category and day so you can see exactly what the trip cost and where it went.",
          phase: "extended",
          isSampleData: true,
        },
        {
          target: "[data-tour='all-insights-trips']",
          page: "/insights",
          title: "Your spending story",
          description:
            "Across every trip and home — compare spending, spot patterns, and see who your most frequent travel companions are.",
          phase: "extended",
          isSampleData: true,
        },
      ]
    : [];

  return [
    // 1 — Welcome modal
    {
      target: null,
      title: "Welcome to Clear",
      description:
        "Clear tracks shared expenses for two kinds of groups — Trips for travel, and Nests for shared homes. Split costs fairly, settle up with the fewest payments, and see where the money goes.",
      phase: "default",
    },

    // 2 — New group button
    {
      target: "[data-tour='new-trip-btn']",
      page: "/groups",
      title: "Create a group",
      description:
        "Tap New group to get started. Choose Trip for a holiday or Nest for a flat — then invite everyone via link or QR code.",
      phase: "default",
    },

    // 3 — Quick-add (interactive — auto-advances when sheet opens)
    {
      target: "[data-tour='trip-card-add-btn']",
      page: "/groups",
      title: "Quick-add an expense",
      description:
        "Tap Add on any group card and type what you spent — Clear parses the amount, payer, and split automatically. Try it now.",
      phase: "default",
      interactive: true,
    },

    // 4 — Nav sheet (opened programmatically via custom event)
    {
      target: "[data-tour='demo-nav-sheet']",
      page: "/groups",
      title: "Your group hub",
      description: "",
      phase: "default",
      navLegend: true,
    },

    // 5-9 — Extended tour (5 steps)
    ...extendedSteps,
  ];
}
