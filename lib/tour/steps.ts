import type { TourStep } from "./types";

export function getTourSteps(demoTripId: string | null): TourStep[] {
  const base = demoTripId ? `/groups/${demoTripId}` : null;

  const tripSteps: TourStep[] = base
    ? [
        {
          target: "[data-tour='trip-quick-actions']",
          page: base,
          title: "Inside a trip",
          description:
            "Jump to Members, Expenses, Settle up, or Insights — everything about this group in one place.",
        },
        {
          target: "[data-tour='expense-add-btn']",
          page: `${base}/expenses`,
          title: "Log expenses",
          description:
            "Every expense shows who paid and how it's split. Hit Add to log one — choose equal split, exact amounts, percentages, or shares.",
        },
        {
          target: "[data-tour='settle-suggestions']",
          page: `${base}/settle`,
          title: "Settle up",
          description:
            "Clear computes the minimum number of payments to clear all debts. Mark payments done or pay directly via UPI.",
        },
        {
          target: "[data-tour='trip-charts']",
          page: `${base}/insights`,
          title: "Insights",
          description:
            "Spending by category, daily patterns, member contributions — and smart observations about your group's habits.",
        },
      ]
    : [];

  return [
    // 1 — Welcome
    {
      target: null,
      title: "Welcome to Clear",
      description:
        "Clear tracks shared expenses for two kinds of groups — Trips for travel, and Nests for shared tabs. Split costs, settle up with the fewest payments, and see where the money goes.",
    },

    // 2 — New group button
    {
      target: "[data-tour='new-trip-btn']",
      page: "/groups",
      title: "Create a group",
      description:
        "Hit New group to get started. Choose Trip for a holiday or Nest for a flat — then invite everyone via link or QR code.",
    },

    // 3 — Sample trip card
    {
      target: "[data-tour='demo-trip']",
      page: "/groups",
      title: "Sample Trip — Goa 2025",
      description:
        "This pre-loaded trip lets you explore the travel features with real data — expenses, balances, settlements, and AI-powered insights.",
    },

    // 4 — Sample nest card
    {
      target: "[data-tour='demo-nest']",
      page: "/groups",
      title: "Sample Nest — Mumbai Flat",
      description:
        "This pre-loaded nest shows shared tab features: recurring expense templates for rent, electricity and WiFi — log each month with one tap, then settle up.",
    },

    // 5 — Quick-add button on a group card
    {
      target: "[data-tour='trip-card-add-btn']",
      page: "/groups",
      title: "Quick-add an expense",
      description:
        "Tap Add on any group card to log an expense in seconds — type what you spent and Clear parses the amount, payer, and split automatically.",
    },

    // 6–9 — Inside the demo trip
    ...tripSteps,

    // 10 — All-groups insights charts
    {
      target: "[data-tour='all-insights-charts']",
      page: "/insights",
      title: "Insights across all groups",
      description:
        "A portfolio view across every trip and nest — total spend, category habits, your most frequent companions, and smarter patterns over time.",
    },
  ];
}
