import type { TourStep } from "./types";

export function getTourSteps(demoTripId: string | null): TourStep[] {
  const base = demoTripId ? `/trips/${demoTripId}` : null;

  const tripSteps: TourStep[] = base
    ? [
        {
          target: "[data-tour='trip-quick-actions']",
          page: base,
          title: "Inside a trip",
          description:
            "Jump to Members, Expenses, Settle up, or Insights — everything about this trip in one place.",
        },
        {
          target: "[data-tour='expense-add-btn']",
          page: `${base}/expenses`,
          title: "Log expenses",
          description:
            "Add what was spent, who paid, and split it however you like — equally, by exact amount, percentage, or shares.",
        },
        {
          target: "[data-tour='settle-suggestions']",
          page: `${base}/settle`,
          title: "Settle up",
          description:
            "The app computes the minimum number of payments to clear all debts. Mark payments done or pay directly via UPI.",
        },
        {
          target: "[data-tour='trip-kpis']",
          page: `${base}/insights`,
          title: "Trip insights",
          description:
            "Spending by category, daily patterns, member contributions — and smart observations about your group's habits.",
        },
      ]
    : [];

  return [
    // 1 — Welcome
    {
      target: null,
      title: "Welcome to Wayfare",
      description:
        "Track group expenses on trips, split costs across everyone, and settle up with the fewest possible payments. Let's take a quick tour.",
    },

    // 2 — New trip button
    {
      target: "[data-tour='new-trip-btn']",
      page: "/trips",
      title: "Create your own trip",
      description:
        "Hit New trip to start tracking your own group. Add a cover photo, set dates and a budget, then invite companions via link or QR code.",
    },

    // 3 — Sample trip card (demoTripId is read from DOM here)
    {
      target: "[data-tour='demo-trip']",
      page: "/trips",
      title: "Your sample trip",
      description:
        "This pre-loaded Goa trip lets you explore every feature with real data — expenses, balances, settlements, and insights.",
    },

    // 4–7 — Inside the demo trip (appended once demoTripId is known)
    ...tripSteps,

    // 8 — All-trips Insights (back on /trips, highlight nav link)
    {
      target: "[data-tour='nav-insights']",
      page: "/trips",
      title: "All-trips insights",
      description:
        "A portfolio view across all your trips — total spend, category habits, your most-travelled companions, and smarter spending patterns.",
    },
  ];
}
