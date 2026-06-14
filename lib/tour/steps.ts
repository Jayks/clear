import type { TourStep } from "./types";

/**
 * A short, linear "tour your sample" walk-through. Every targeted step anchors on
 * an element that actually exists, and the flow starts from the Sample tab's demo
 * trip card, so it works regardless of which home tab the user launched from.
 *
 * Steps 2+ require the seeded demo trip; with no demo we only show the welcome.
 */
export function getTourSteps(demoTripId: string | null): TourStep[] {
  const welcome: TourStep = {
    target: null,
    title: "Welcome to Clear",
    description:
      "Clear tracks shared money four ways — Trips, Nests, Circles and one-on-one Streams. Here's a 30-second walk through a sample trip.",
  };

  if (!demoTripId) return [welcome];
  const base = `/groups/${demoTripId}`;

  return [
    welcome,

    // 2 — the sample trip card on the home (Sample tab)
    {
      target: "[data-tour='demo-trip']",
      page: "/groups",
      title: "Your sample trip",
      description: "This is real, editable demo data — a 5-day Goa trip with five people. Let's look inside.",
      isSampleData: true,
    },

    // 3 — the four things every group has
    {
      target: "[data-tour='trip-quick-actions']",
      page: base,
      title: "Everything in one place",
      description: "Expenses, Settle up, Members and Insights — every group opens to these four.",
      isSampleData: true,
    },

    // 4 — how to log (Scan / Speak / Type legend)
    {
      target: null,
      page: base,
      title: "Log an expense, three ways",
      description: "",
      isSampleData: true,
      quickAddLegend: true,
    },

    // 5 — expenses: filters + views legend
    {
      target: "[data-tour='expense-list-header']",
      page: `${base}/expenses`,
      title: "Browse it your way",
      description: "",
      isSampleData: true,
      viewsLegend: true,
    },

    // 6 — settle up
    {
      target: "[data-tour='debt-flow-graph']",
      page: `${base}/settle`,
      title: "Settle up the easy way",
      description: "Every debt mapped as a flow, with the fewest payments to clear everyone. Tap an arc to see who pays whom.",
      isSampleData: true,
    },

    // 7 — insights
    {
      target: "[data-tour='insights-charts']",
      page: `${base}/insights`,
      title: "See where it went",
      description: "Charts break the trip down by category and day — so the story of your spending is obvious at a glance.",
      isSampleData: true,
    },
  ];
}
