import { differenceInDays, parseISO, isAfter } from "date-fns";
import { getCategory } from "@/lib/categories";

// ── Spend Trajectory ─────────────────────────────────────────────────────────

export type PaceStatus = "on_track" | "close" | "over" | "unknown";

export interface TrajectoryResult {
  dailyBurnRate: number;
  daysElapsed: number;
  tripDays: number | null;
  daysRemaining: number | null;
  projectedTotal: number | null;
  budget: number | null;
  projectedOverage: number | null;
  percentBudgetUsed: number | null;
  paceStatus: PaceStatus;
}

export function computeSpendTrajectory(params: {
  totalSpend: number;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  today?: Date;
}): TrajectoryResult | null {
  const { totalSpend, startDate, endDate, budget, today = new Date() } = params;
  if (!startDate) return null;
  if (totalSpend === 0 && !budget) return null;

  const start = parseISO(startDate);
  if (isAfter(start, today)) return null; // trip hasn't started

  const tripDays = endDate
    ? Math.max(1, differenceInDays(parseISO(endDate), start) + 1)
    : null;

  const daysElapsed = Math.max(
    1,
    tripDays !== null
      ? Math.min(differenceInDays(today, start) + 1, tripDays)
      : differenceInDays(today, start) + 1
  );

  const dailyBurnRate = Math.round(totalSpend / daysElapsed);
  const daysRemaining = tripDays !== null ? Math.max(0, tripDays - daysElapsed) : null;
  const projectedTotal =
    daysRemaining !== null ? Math.round(totalSpend + dailyBurnRate * daysRemaining) : null;

  const percentBudgetUsed =
    budget !== null && budget > 0 ? Math.round((totalSpend / budget) * 100) : null;

  const projectedOverage =
    budget !== null && projectedTotal !== null ? projectedTotal - budget : null;

  let paceStatus: PaceStatus = "unknown";
  if (budget !== null) {
    if (projectedTotal !== null) {
      const ratio = projectedTotal / budget;
      paceStatus = ratio <= 1.0 ? "on_track" : ratio <= 1.15 ? "close" : "over";
    } else {
      // No end date — compare spend vs budget directly
      paceStatus =
        totalSpend > budget ? "over" : totalSpend > budget * 0.85 ? "close" : "on_track";
    }
  }

  return {
    dailyBurnRate,
    daysElapsed,
    tripDays,
    daysRemaining,
    projectedTotal,
    budget,
    projectedOverage,
    percentBudgetUsed,
    paceStatus,
  };
}

// ── Cross-Trip Comparisons ────────────────────────────────────────────────────

export interface OtherTripSummary {
  tripId: string;
  totalSpend: number;
  memberCount: number;
  startDate: string | null;
  endDate: string | null;
  currency: string;
  categoryTotals: Record<string, number>;
}

export interface CrossTripInsight {
  emoji: string;
  title: string;
  sub: string;
}

export function computeCrossTripInsights(params: {
  current: {
    totalSpend: number;
    memberCount: number;
    tripDays: number;
    currency: string;
    topCategory: string | null;
    topCategoryPct: number;
    perPersonDaily: number;
  };
  others: OtherTripSummary[];
}): CrossTripInsight[] {
  const { current, others } = params;
  if (others.length === 0 || current.totalSpend === 0) return [];

  const insights: CrossTripInsight[] = [];
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: current.currency,
      maximumFractionDigits: 0,
    }).format(n);

  // 1. Per-person-per-day comparison
  const othersWithRate = others.filter((t) => {
    const td =
      t.startDate && t.endDate
        ? Math.max(1, differenceInDays(parseISO(t.endDate), parseISO(t.startDate)) + 1)
        : null;
    return td !== null && t.memberCount > 0 && t.totalSpend > 0;
  });

  if (othersWithRate.length > 0 && current.perPersonDaily > 0) {
    const avgOtherPPD =
      othersWithRate.reduce((s, t) => {
        const td = differenceInDays(parseISO(t.endDate!), parseISO(t.startDate!)) + 1;
        return s + t.totalSpend / (t.memberCount * Math.max(1, td));
      }, 0) / othersWithRate.length;

    const pctDiff = Math.round(
      ((current.perPersonDaily - avgOtherPPD) / avgOtherPPD) * 100
    );
    const absDiff = Math.abs(pctDiff);

    if (absDiff >= 5) {
      insights.push({
        emoji: pctDiff > 0 ? "📈" : "📉",
        title: `${fmt(current.perPersonDaily)}/person/day`,
        sub:
          pctDiff > 0
            ? `${absDiff}% more per day than your usual trips`
            : `${absDiff}% less per day than usual — well paced`,
      });
    } else {
      insights.push({
        emoji: "📊",
        title: `${fmt(current.perPersonDaily)}/person/day`,
        sub: "Right on par with your average trip pace",
      });
    }
  }

  // 2. Spend ranking across all trips
  const allSpends = [...others.map((t) => t.totalSpend), current.totalSpend].sort(
    (a, b) => b - a
  );
  const rank = allSpends.indexOf(current.totalSpend) + 1;
  const total = allSpends.length;
  if (total >= 2) {
    insights.push({
      emoji: rank === 1 ? "🏆" : rank === total ? "💚" : "📋",
      title:
        rank === 1
          ? "Your most expensive trip"
          : rank === total
          ? "Your most budget-friendly trip"
          : `#${rank} of ${total} by total spend`,
      sub:
        rank === 1
          ? `${fmt(current.totalSpend)} — your biggest yet`
          : rank === total
          ? `${fmt(current.totalSpend)} — your leanest trip`
          : `${fmt(current.totalSpend)} out of a ${fmt(allSpends[0])} high`,
    });
  }

  // 3. Top category vs usual
  if (current.topCategory && current.topCategoryPct > 0) {
    const catSums: Record<string, number> = {};
    let otherCatTotal = 0;
    for (const t of others) {
      for (const [cat, amt] of Object.entries(t.categoryTotals)) {
        catSums[cat] = (catSums[cat] ?? 0) + amt;
        otherCatTotal += amt;
      }
    }
    const otherTopEntry = Object.entries(catSums).sort(([, a], [, b]) => b - a)[0];
    const currentLabel = getCategory(current.topCategory).label;

    if (otherTopEntry) {
      const otherTopCat = otherTopEntry[0];
      const otherTopPct =
        otherCatTotal > 0 ? Math.round((otherTopEntry[1] / otherCatTotal) * 100) : 0;
      const otherLabel = getCategory(otherTopCat).label;

      if (current.topCategory === otherTopCat) {
        insights.push({
          emoji: "🔁",
          title: `${currentLabel} leads again`,
          sub: `${current.topCategoryPct}% this trip vs ${otherTopPct}% across your other trips`,
        });
      } else {
        insights.push({
          emoji: "🔀",
          title: `${currentLabel} dominates this trip`,
          sub: `Usually it's ${otherLabel} — a different mix this time`,
        });
      }
    }
  }

  // 4. Group size comparison
  if (others.length >= 1) {
    const avgMembers = others.reduce((s, t) => s + t.memberCount, 0) / others.length;
    const diff = current.memberCount - Math.round(avgMembers);
    if (Math.abs(diff) >= 2) {
      insights.push({
        emoji: diff > 0 ? "👥" : "👤",
        title:
          diff > 0
            ? `${current.memberCount} people — bigger crew than usual`
            : `${current.memberCount} people — smaller group this time`,
        sub: `Your trips average ${Math.round(avgMembers)} members`,
      });
    }
  }

  return insights;
}
