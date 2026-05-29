import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { MonthSpend } from "@/components/insights/monthly-spend-bar";
import type { Highlight } from "@/lib/insights/trip-insights";

type NestExpense = {
  groupId: string;
  amount: string;
  expenseDate: string;
  sourceTemplateId: string | null;
};

export interface NestSummary {
  nestId: string;
  name: string;
  totalSpend: number;
  expenseCount: number;
  memberCount: number;
  monthlyAverage: number;
  currency: string;
}

export interface YearOverYear {
  periodLabel: string;   // e.g. "Jan–May"
  thisYear: number;
  lastYear: number;
  pct: number;           // positive = up, negative = down
  year: number;          // current year
}

export interface BiggestMonth {
  label: string;         // e.g. "Nov '25"
  month: string;         // YYYY-MM
  amount: number;
  pctAboveAvg: number;
}

export interface AllNestsInsights {
  nestCount: number;
  totalSpend: number;
  totalExpenses: number;
  monthlyAverage: number;
  uniqueMates: number;
  recurringTotal: number;
  recurringPct: number;
  biggestMonth: BiggestMonth | null;
  yearOverYear: YearOverYear | null;
  currency: string;

  byNest: NestSummary[];
  monthlyTrend: MonthSpend[];
  topCategories: { category: string; label: string; amount: number; percentage: number; hex: string }[];
  highlights: Highlight[];
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function computeAllNestsInsights(params: {
  nests: Group[];
  allExpenses: NestExpense[];
  categoryTotals: Record<string, number>;
  allMembers: GroupMember[];
  currentUserId: string;
  currency?: string;
}): AllNestsInsights {
  const { nests, allExpenses, categoryTotals, allMembers, currentUserId } = params;
  const currency = params.currency ?? nests[0]?.defaultCurrency ?? "INR";

  const nestCount = nests.length;
  const totalSpend = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = allExpenses.length;

  // ── Recurring totals ─────────────────────────────────────────────────────
  const recurringTotal = allExpenses
    .filter((e) => !!e.sourceTemplateId)
    .reduce((s, e) => s + Number(e.amount), 0);
  const recurringPct = totalSpend > 0 ? Math.round((recurringTotal / totalSpend) * 100) : 0;

  // ── Monthly trend across all nests ──────────────────────────────────────
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

  // ── Biggest month ever ───────────────────────────────────────────────────
  let biggestMonth: BiggestMonth | null = null;
  if (sortedMonths.length > 0) {
    const peak = sortedMonths.reduce((max, cur) => cur[1].amount > max[1].amount ? cur : max, sortedMonths[0]);
    const [yr, mo] = peak[0].split("-");
    const label = `${MONTH_NAMES[Number(mo) - 1]} '${String(yr).slice(2)}`;
    const pctAboveAvg = monthlyAverage > 0
      ? Math.round(((peak[1].amount - monthlyAverage) / monthlyAverage) * 100)
      : 0;
    biggestMonth = { label, month: peak[0], amount: peak[1].amount, pctAboveAvg };
  }

  // ── Year-over-year (same-period comparison) ──────────────────────────────
  let yearOverYear: YearOverYear | null = null;
  const now = new Date();
  const currentYear = now.getFullYear();

  const thisYearEntries = sortedMonths.filter(([k]) => Number(k.slice(0, 4)) === currentYear);
  const lastYearMatchingEntries = sortedMonths.filter(([k]) => {
    if (Number(k.slice(0, 4)) !== currentYear - 1) return false;
    const mo = k.slice(5, 7);
    return thisYearEntries.some(([tk]) => tk.slice(5, 7) === mo);
  });

  if (thisYearEntries.length >= 1 && lastYearMatchingEntries.length >= 1) {
    const thisYearTotal = thisYearEntries.reduce((s, [, v]) => s + v.amount, 0);
    const lastYearTotal = lastYearMatchingEntries.reduce((s, [, v]) => s + v.amount, 0);
    if (lastYearTotal > 0) {
      // Build period label, e.g. "Jan–May"
      const months = thisYearEntries.map(([k]) => Number(k.slice(5)) - 1);
      const minMo = Math.min(...months);
      const maxMo = Math.max(...months);
      const periodLabel = minMo === maxMo
        ? MONTH_NAMES[minMo]
        : `${MONTH_NAMES[minMo]}–${MONTH_NAMES[maxMo]}`;
      const pct = Math.round(((thisYearTotal - lastYearTotal) / lastYearTotal) * 100);
      yearOverYear = { periodLabel, thisYear: thisYearTotal, lastYear: lastYearTotal, pct, year: currentYear };
    }
  }

  // ── Unique mates ─────────────────────────────────────────────────────────
  const seenUsers = new Set<string>();
  const seenGuests = new Set<string>();
  for (const m of allMembers) {
    if (m.userId && m.userId !== currentUserId) seenUsers.add(m.userId);
    if (m.guestName) seenGuests.add(m.guestName.toLowerCase());
  }
  const uniqueMates = seenUsers.size + seenGuests.size;

  // ── Per-nest summaries ───────────────────────────────────────────────────
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

  // ── Highlights (3 vivid spotlight cards) ────────────────────────────────
  const highlights: Highlight[] = [];
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  // 1. Recurring baseline
  const recurringPerMonth = sortedMonths.length > 0
    ? Math.round(recurringTotal / sortedMonths.length)
    : 0;
  if (recurringPct > 0 && recurringPerMonth > 0) {
    highlights.push({
      emoji: "🔄",
      title: `${fmt(recurringPerMonth)}/month locked in`,
      sub: `${recurringPct}% of all spend is from templates · your financial baseline`,
      accentColor: "from-cyan-400 to-teal-500",
    });
  }

  // 2. Biggest month ever
  if (biggestMonth) {
    highlights.push({
      emoji: "📈",
      title: `${biggestMonth.label} was your peak`,
      sub: `${fmt(biggestMonth.amount)}${biggestMonth.pctAboveAvg > 0 ? ` · ${biggestMonth.pctAboveAvg}% above your average` : " · your highest month"}`,
      accentColor: "from-amber-400 to-orange-500",
    });
  }

  // 3. Year-over-year (preferred) or MoM trend (fallback)
  if (yearOverYear && Math.abs(yearOverYear.pct) >= 3) {
    const isUp = yearOverYear.pct > 0;
    highlights.push({
      emoji: isUp ? "📈" : "📉",
      title: `Spending ${isUp ? "up" : "down"} ${Math.abs(yearOverYear.pct)}% year-on-year`,
      sub: `${yearOverYear.periodLabel} ${yearOverYear.year}: ${fmt(yearOverYear.thisYear)} vs ${yearOverYear.year - 1}: ${fmt(yearOverYear.lastYear)}`,
      accentColor: isUp ? "from-rose-400 to-red-500" : "from-emerald-400 to-teal-500",
    });
  } else if (sortedMonths.length >= 2) {
    const last = sortedMonths[sortedMonths.length - 1][1].amount;
    const prev = sortedMonths[sortedMonths.length - 2][1].amount;
    if (prev > 0) {
      const momPct = Math.round(Math.abs((last - prev) / prev) * 100);
      const isUp = last > prev;
      highlights.push({
        emoji: isUp ? "📈" : "📉",
        title: momPct > 0
          ? `${momPct}% ${isUp ? "more" : "less"} this month`
          : "Consistent spending",
        sub: `${fmt(last)} this month vs ${fmt(prev)} last month`,
        accentColor: isUp ? "from-rose-400 to-red-500" : "from-emerald-400 to-teal-500",
      });
    }
  }

  return {
    nestCount, totalSpend, totalExpenses, monthlyAverage, uniqueMates,
    recurringTotal, recurringPct, biggestMonth, yearOverYear, currency,
    byNest, monthlyTrend, topCategories, highlights,
  };
}
