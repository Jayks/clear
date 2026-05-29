import { differenceInDays, parseISO, format } from "date-fns";
import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { Highlight } from "@/lib/insights/trip-insights";

export interface TripSummary {
  tripId: string;
  name: string;
  totalSpend: number;
  expenseCount: number;
  memberCount: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
}

export interface AllTripsInsights {
  totalSpend: number;
  tripCount: number;
  totalExpenses: number;
  uniqueCompanions: number;
  avgTripCost: number;
  totalDays: number;
  dailyPace: number;
  mostTraveledWith: { name: string; tripCount: number } | null;
  mostTraveledMonth: string | null;

  byTrip: TripSummary[];           // sorted chronologically (undated trips last)
  topCategories: { category: string; label: string; amount: number; percentage: number; hex: string }[];
  highlights: Highlight[];
}

const MONTH_NAMES_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function computeAllTripsInsights(params: {
  trips: Group[];
  summaries: TripSummary[];
  categoryTotals: Record<string, number>;
  allMembers: GroupMember[];
  currentUserId: string;
}): AllTripsInsights {
  const { trips, summaries, categoryTotals, allMembers, currentUserId } = params;

  const totalSpend = summaries.reduce((s, t) => s + t.totalSpend, 0);
  const tripCount = trips.length;
  const totalExpenses = summaries.reduce((s, t) => s + t.expenseCount, 0);
  const avgTripCost = tripCount > 0 ? Math.round(totalSpend / tripCount) : 0;

  // ── Total days on the road ───────────────────────────────────────────────
  const totalDays = summaries.reduce((s, t) => {
    if (!t.startDate || !t.endDate) return s;
    return s + Math.max(1, differenceInDays(parseISO(t.endDate), parseISO(t.startDate)) + 1);
  }, 0);
  const dailyPace = totalDays > 0 ? Math.round(totalSpend / totalDays) : 0;

  // ── Most traveled month ──────────────────────────────────────────────────
  const monthCount: Record<number, number> = {};
  for (const t of summaries) {
    if (!t.startDate) continue;
    const mo = parseISO(t.startDate).getMonth();
    monthCount[mo] = (monthCount[mo] ?? 0) + 1;
  }
  const topMonthEntry = Object.entries(monthCount).sort(([, a], [, b]) => b - a)[0];
  const mostTraveledMonth = topMonthEntry ? MONTH_NAMES_FULL[Number(topMonthEntry[0])] : null;

  // ── Most traveled with ──────────────────────────────────────────────────
  // Group allMembers by userId, count distinct trip groups per companion
  const companionGroups: Record<string, { name: string; groupIds: Set<string> }> = {};
  for (const m of allMembers) {
    if (!m.userId || m.userId === currentUserId) continue;
    if (!companionGroups[m.userId]) {
      companionGroups[m.userId] = {
        name: m.displayName ?? m.guestName ?? "Travel mate",
        groupIds: new Set(),
      };
    }
    companionGroups[m.userId].groupIds.add(m.groupId);
  }
  const topUserCompanion = Object.values(companionGroups)
    .sort((a, b) => b.groupIds.size - a.groupIds.size)[0];

  // Also match by consistent guest name (no userId) — same lowercase name
  // appearing across multiple trips is very likely the same person.
  const guestCompanionGroups: Record<string, { name: string; groupIds: Set<string> }> = {};
  for (const m of allMembers) {
    if (m.userId || !m.guestName) continue;
    const key = m.guestName.toLowerCase().trim();
    if (!guestCompanionGroups[key]) {
      guestCompanionGroups[key] = { name: m.guestName, groupIds: new Set() };
    }
    guestCompanionGroups[key].groupIds.add(m.groupId);
  }
  const topGuestCompanion = Object.values(guestCompanionGroups)
    .filter((g) => g.groupIds.size >= 2)
    .sort((a, b) => b.groupIds.size - a.groupIds.size)[0];

  // Prefer whichever companion type appears in more trips
  const userEntry = topUserCompanion?.groupIds.size >= 2
    ? { name: topUserCompanion.name, tripCount: topUserCompanion.groupIds.size }
    : null;
  const guestEntry = topGuestCompanion
    ? { name: topGuestCompanion.name, tripCount: topGuestCompanion.groupIds.size }
    : null;

  const mostTraveledWith =
    userEntry && guestEntry
      ? (userEntry.tripCount >= guestEntry.tripCount ? userEntry : guestEntry)
      : (userEntry ?? guestEntry);

  // ── Unique companions ────────────────────────────────────────────────────
  const seenUsers = new Set<string>();
  const seenGuests = new Set<string>();
  for (const m of allMembers) {
    if (m.userId && m.userId !== currentUserId) seenUsers.add(m.userId);
    if (m.guestName) seenGuests.add(m.guestName.toLowerCase());
  }
  const uniqueCompanions = seenUsers.size + seenGuests.size;

  // ── Category breakdown ───────────────────────────────────────────────────
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

  // ── Sort trips chronologically; undated trips go last ───────────────────
  const byTrip = [...summaries].sort((a, b) => {
    if (!a.startDate && !b.startDate) return b.totalSpend - a.totalSpend;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });

  // ── Highlights (3 vivid spotlight cards) ────────────────────────────────
  const highlights: Highlight[] = [];
  const primaryCurrency = summaries[0]?.currency ?? "INR";
  const fmt = (n: number, cur = primaryCurrency) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

  // 1. Biggest trip by total spend
  const biggestTrip = [...summaries].sort((a, b) => b.totalSpend - a.totalSpend)[0];
  if (biggestTrip && biggestTrip.totalSpend > 0) {
    const dateStr = biggestTrip.startDate
      ? ` · ${format(parseISO(biggestTrip.startDate), "MMM yyyy")}`
      : "";
    highlights.push({
      emoji: "✈️",
      title: biggestTrip.name,
      sub: `Your most expensive trip · ${fmt(biggestTrip.totalSpend, biggestTrip.currency)}${dateStr}`,
      accentColor: "from-amber-400 to-orange-500",
    });
  }

  // 2. Daily travel pace
  if (totalDays > 0 && dailyPace > 0) {
    highlights.push({
      emoji: "📊",
      title: `${fmt(dailyPace)}/day`,
      sub: `Your travel pace · across ${totalDays} days on the road`,
      accentColor: "from-cyan-400 to-teal-500",
    });
  } else if (avgTripCost > 0) {
    // Fallback when no dates: avg trip cost
    highlights.push({
      emoji: "💰",
      title: `${fmt(avgTripCost)} avg/trip`,
      sub: `Average across your ${tripCount} trip${tripCount !== 1 ? "s" : ""}`,
      accentColor: "from-cyan-400 to-teal-500",
    });
  }

  // 3. Most traveled with (companion) — OR most-traveled month as fallback
  if (mostTraveledWith) {
    highlights.push({
      emoji: "🤝",
      title: mostTraveledWith.name,
      sub: `Your most frequent travel companion · ${mostTraveledWith.tripCount} trips together`,
      accentColor: "from-violet-400 to-purple-500",
    });
  } else if (mostTraveledMonth) {
    highlights.push({
      emoji: "📅",
      title: `${mostTraveledMonth} is your month`,
      sub: `You travel most in ${mostTraveledMonth}`,
      accentColor: "from-violet-400 to-purple-500",
    });
  }

  return {
    totalSpend, tripCount, totalExpenses, uniqueCompanions, avgTripCost,
    totalDays, dailyPace, mostTraveledWith, mostTraveledMonth,
    byTrip, topCategories, highlights,
  };
}
