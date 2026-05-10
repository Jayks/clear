import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { Expense } from "@/lib/db/schema/expenses";
import type { MonthSpend } from "@/components/insights/monthly-spend-bar";

export interface NestSummary {
  nestId: string;
  name: string;
  totalSpend: number;
  expenseCount: number;
  memberCount: number;
  monthlyAverage: number;
  currency: string;
}

export interface AllNestsInsights {
  nestCount: number;
  totalSpend: number;
  totalExpenses: number;
  monthlyAverage: number;
  uniqueMates: number;
  byNest: NestSummary[];
  monthlyTrend: MonthSpend[];
  topCategories: { category: string; label: string; amount: number; percentage: number; hex: string }[];
  smartInsights: { emoji: string; title: string; sub: string }[];
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function computeAllNestsInsights(params: {
  nests: Group[];
  allExpenses: Expense[];
  categoryTotals: Record<string, number>;
  allMembers: GroupMember[];
  currentUserId: string;
}): AllNestsInsights {
  const { nests, allExpenses, categoryTotals, allMembers, currentUserId } = params;

  const nestCount = nests.length;
  const totalSpend = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = allExpenses.length;

  // Monthly trend across all nests combined
  const monthMap = new Map<string, { amount: number; recurring: number; adhoc: number }>();
  for (const e of allExpenses) {
    const key = e.expenseDate.slice(0, 7);
    const existing = monthMap.get(key) ?? { amount: 0, recurring: 0, adhoc: 0 };
    const amt = Number(e.amount);
    const isRecurring = !!e.sourceTemplateId;
    monthMap.set(key, {
      amount: existing.amount + amt,
      recurring: existing.recurring + (isRecurring ? amt : 0),
      adhoc: existing.adhoc + (!isRecurring ? amt : 0),
    });
  }

  const sortedMonths = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const monthlyTrend: MonthSpend[] = sortedMonths.map(([key, val]) => {
    const [year, month] = key.split("-");
    const label = `${MONTH_NAMES[Number(month) - 1]} '${String(year).slice(2)}`;
    return { label, month: key, ...val };
  });

  const monthlyAverage = sortedMonths.length > 0 ? Math.round(totalSpend / sortedMonths.length) : 0;

  // Unique mates (not current user)
  const seenUsers = new Set<string>();
  const seenGuests = new Set<string>();
  for (const m of allMembers) {
    if (m.userId && m.userId !== currentUserId) seenUsers.add(m.userId);
    if (m.guestName) seenGuests.add(m.guestName.toLowerCase());
  }
  const uniqueMates = seenUsers.size + seenGuests.size;

  // Per-nest summaries
  const byNest: NestSummary[] = nests.map((nest) => {
    const nestExpenses = allExpenses.filter((e) => e.groupId === nest.id);
    const nestSpend = nestExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const nestMonths = new Set(nestExpenses.map((e) => e.expenseDate.slice(0, 7))).size;
    return {
      nestId: nest.id,
      name: nest.name,
      totalSpend: nestSpend,
      expenseCount: nestExpenses.length,
      memberCount: allMembers.filter((m) => m.groupId === nest.id).length,
      monthlyAverage: nestMonths > 0 ? Math.round(nestSpend / nestMonths) : 0,
      currency: nest.defaultCurrency,
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);

  // Category breakdown
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

  // Smart insights
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const smartInsights: { emoji: string; title: string; sub: string }[] = [];

  if (nestCount > 0) {
    smartInsights.push({
      emoji: "🏠",
      title: `${fmt(monthlyAverage)} average monthly spend`,
      sub: `Across ${nestCount} nest${nestCount > 1 ? "s" : ""} over ${sortedMonths.length} month${sortedMonths.length !== 1 ? "s" : ""}`,
    });

    if (topCategories[0]) {
      smartInsights.push({
        emoji: "📊",
        title: `${topCategories[0].label} is your biggest cost`,
        sub: `${topCategories[0].percentage}% of total spend`,
      });
    }

    const recurringTotal = allExpenses.filter((e) => e.sourceTemplateId).reduce((s, e) => s + Number(e.amount), 0);
    const recurringPct = totalSpend > 0 ? Math.round((recurringTotal / totalSpend) * 100) : 0;
    if (recurringPct > 0) {
      smartInsights.push({
        emoji: "🔄",
        title: `${recurringPct}% of spend is recurring`,
        sub: `${fmt(recurringTotal)} logged from templates — the predictable part of your bills`,
      });
    }

    if (uniqueMates > 0) {
      smartInsights.push({
        emoji: "👥",
        title: `${uniqueMates} mate${uniqueMates > 1 ? "s" : ""}`,
        sub: "Unique people you split expenses with",
      });
    }

    if (sortedMonths.length >= 2) {
      const last = sortedMonths[sortedMonths.length - 1][1].amount;
      const prev = sortedMonths[sortedMonths.length - 2][1].amount;
      const diff = last - prev;
      const pct = prev > 0 ? Math.round(Math.abs(diff) / prev * 100) : 0;
      smartInsights.push({
        emoji: diff >= 0 ? "📈" : "📉",
        title: diff >= 0
          ? `Spending up ${pct}% vs last month`
          : `Spending down ${pct}% vs last month`,
        sub: `${MONTH_NAMES[Number(sortedMonths[sortedMonths.length - 1][0].split("-")[1]) - 1]}: ${fmt(last)} vs ${MONTH_NAMES[Number(sortedMonths[sortedMonths.length - 2][0].split("-")[1]) - 1]}: ${fmt(prev)}`,
      });
    }

    smartInsights.push({
      emoji: "🧾",
      title: `${totalExpenses} expenses logged`,
      sub: `${Math.round(totalExpenses / Math.max(sortedMonths.length, 1))} per month on average`,
    });
  }

  return { nestCount, totalSpend, totalExpenses, monthlyAverage, uniqueMates, byNest, monthlyTrend, topCategories, smartInsights };
}
