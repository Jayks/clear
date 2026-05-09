import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import type { Trip } from "@/lib/db/schema/trips";
import type { TripMember } from "@/lib/db/schema/trip-members";

export interface TripSummary {
  tripId: string;
  name: string;
  totalSpend: number;
  expenseCount: number;
  memberCount: number;
  currency: string;
}

export interface AllTripsInsights {
  totalSpend: number;
  tripCount: number;
  totalExpenses: number;
  uniqueCompanions: number;
  avgTripCost: number;

  byTrip: TripSummary[];
  topCategories: { category: string; label: string; amount: number; percentage: number; hex: string }[];
  smartInsights: { emoji: string; title: string; sub: string }[];
}

export function computeAllTripsInsights(params: {
  trips: Trip[];
  summaries: TripSummary[];
  categoryTotals: Record<string, number>;
  allMembers: TripMember[];
  currentUserId: string;
}): AllTripsInsights {
  const { trips, summaries, categoryTotals, allMembers, currentUserId } = params;

  const totalSpend = summaries.reduce((s, t) => s + t.totalSpend, 0);
  const tripCount = trips.length;
  const totalExpenses = summaries.reduce((s, t) => s + t.expenseCount, 0);
  const avgTripCost = tripCount > 0 ? Math.round(totalSpend / tripCount) : 0;

  // Unique companions (members who aren't the current user, deduplicated by userId or guestName)
  const seenUsers = new Set<string>();
  const seenGuests = new Set<string>();
  for (const m of allMembers) {
    if (m.userId && m.userId !== currentUserId) seenUsers.add(m.userId);
    if (m.guestName) seenGuests.add(m.guestName.toLowerCase());
  }
  const uniqueCompanions = seenUsers.size + seenGuests.size;

  // Category breakdown across all trips
  const catTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  const topCategories = Object.entries(categoryTotals)
    .map(([cat, amount]) => ({
      category: cat,
      label: getCategory(cat).label,
      amount,
      percentage: catTotal > 0 ? Math.round((amount / catTotal) * 100) : 0,
      hex: CATEGORY_HEX[cat] ?? "#64748B",
    }))
    .sort((a, b) => b.amount - a.amount);

  const byTrip = summaries.sort((a, b) => b.totalSpend - a.totalSpend);

  // Smart insights
  const smartInsights: { emoji: string; title: string; sub: string }[] = [];
  const fmt = (n: number, cur: string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

  if (tripCount > 0) {
    const primaryCurrency = summaries[0]?.currency ?? "INR";

    smartInsights.push({
      emoji: "✈️",
      title: `${tripCount} trip${tripCount > 1 ? "s" : ""}, ${fmt(totalSpend, primaryCurrency)} total`,
      sub: `That's ${fmt(avgTripCost, primaryCurrency)} on average per trip`,
    });

    if (topCategories[0]) {
      smartInsights.push({
        emoji: "🍽️",
        title: `${topCategories[0].label} is your go-to category`,
        sub: `${topCategories[0].percentage}% of all travel spend across every trip`,
      });
    }

    const mostExpensive = byTrip[0];
    if (mostExpensive) {
      smartInsights.push({
        emoji: "💎",
        title: `${mostExpensive.name} was your biggest trip`,
        sub: `${fmt(mostExpensive.totalSpend, mostExpensive.currency)} across ${mostExpensive.expenseCount} expenses`,
      });
    }

    if (uniqueCompanions > 0) {
      smartInsights.push({
        emoji: "👥",
        title: `${uniqueCompanions} travel companion${uniqueCompanions > 1 ? "s" : ""}`,
        sub: "Unique people you've shared trip expenses with",
      });
    }

    smartInsights.push({
      emoji: "🧾",
      title: `${totalExpenses} expenses logged`,
      sub: `${Math.round(totalExpenses / Math.max(tripCount, 1))} expenses per trip on average`,
    });
  }

  return { totalSpend, tripCount, totalExpenses, uniqueCompanions, avgTripCost, byTrip, topCategories, smartInsights };
}
