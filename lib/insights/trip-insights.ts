import { eachDayOfInterval, parseISO, format, differenceInDays } from "date-fns";
import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { Expense } from "@/lib/db/schema/expenses";
import type { ExpenseSplit } from "@/lib/db/schema/expense-splits";

export interface CategorySlice {
  category: string;
  label: string;
  amount: number;
  percentage: number;
  hex: string;
}

export interface DaySpend {
  label: string;   // "May 15"
  date: string;    // ISO for sorting
  amount: number;
  /** Category → amount breakdown for the stacked daily-spend chart */
  cats: Record<string, number>;
}

export interface MemberRow {
  memberId: string;
  name: string;
  paid: number;
  owed: number;
  net: number;
}

/** A vivid spotlight card surfaced directly below KPIs. */
export interface Highlight {
  emoji: string;
  title: string;
  sub: string;
  /** Tailwind gradient pair, e.g. "from-amber-400 to-orange-500" */
  accentColor: string;
}

export interface TripInsights {
  totalSpend: number;
  perPerson: number;
  dailyAverage: number;
  expenseCount: number;
  tripDays: number;
  biggestExpense: { description: string; amount: number } | null;
  topCategory: CategorySlice | null;
  currency: string;

  byCategory: CategorySlice[];
  byDay: DaySpend[];
  byMember: MemberRow[];
  highlights: Highlight[];
}

function r2(n: number) { return Math.round(n * 100) / 100; }

function formatAmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function computeTripInsights(params: {
  trip: Group;
  members: GroupMember[];
  expensesWithSplits: { expense: Expense; splits: ExpenseSplit[] }[];
}): TripInsights {
  const { trip, members, expensesWithSplits } = params;
  const currency = trip.defaultCurrency;
  const isNest = trip.groupType === "nest";
  const expenseList = expensesWithSplits.map((e) => e.expense);

  if (expenseList.length === 0) {
    return {
      totalSpend: 0, perPerson: 0, dailyAverage: 0,
      expenseCount: 0, tripDays: 1, biggestExpense: null,
      topCategory: null, currency,
      byCategory: [], byDay: [], byMember: [], highlights: [],
    };
  }

  const totalSpend = r2(expenseList.reduce((s, e) => s + Number(e.amount), 0));
  const perPerson = r2(members.length > 0 ? totalSpend / members.length : 0);

  // Trip duration
  let tripDays = 1;
  if (trip.startDate && trip.endDate) {
    tripDays = Math.max(1, differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1);
  }
  const dailyAverage = r2(totalSpend / tripDays);

  // Biggest expense
  const biggestExpense = expenseList.reduce((max, e) =>
    Number(e.amount) > Number(max.amount) ? e : max
  , expenseList[0]);

  // ── Category breakdown ──────────────────────────────────────────────────
  const catTotals: Record<string, number> = {};
  for (const e of expenseList) {
    catTotals[e.category] = r2((catTotals[e.category] ?? 0) + Number(e.amount));
  }
  const byCategory: CategorySlice[] = Object.entries(catTotals)
    .map(([cat, amount]) => ({
      category: cat,
      label: getCategory(cat).label,
      amount,
      percentage: Math.round((amount / totalSpend) * 100),
      hex: CATEGORY_HEX[cat] ?? "#64748B",
    }))
    .sort((a, b) => b.amount - a.amount);

  // ── Daily spend ─────────────────────────────────────────────────────────
  const dayMap: Record<string, number> = {};
  const dayCatMap: Record<string, Record<string, number>> = {};
  for (const e of expenseList) {
    dayMap[e.expenseDate] = r2((dayMap[e.expenseDate] ?? 0) + Number(e.amount));
    if (!dayCatMap[e.expenseDate]) dayCatMap[e.expenseDate] = {};
    dayCatMap[e.expenseDate][e.category] = r2(
      (dayCatMap[e.expenseDate][e.category] ?? 0) + Number(e.amount)
    );
  }

  let byDay: DaySpend[];
  if (trip.startDate && trip.endDate) {
    // For active trips truncate to today — prevents future zero-bars on the right
    // side of the chart. Completed and future trips use the full planned range.
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const isActive = trip.startDate <= todayStr && todayStr <= trip.endDate;
    const effectiveEnd = isActive ? todayStr : trip.endDate;

    byDay = eachDayOfInterval({ start: parseISO(trip.startDate), end: parseISO(effectiveEnd) }).map((d) => {
      const iso = format(d, "yyyy-MM-dd");
      return { label: format(d, "MMM d"), date: iso, amount: dayMap[iso] ?? 0, cats: dayCatMap[iso] ?? {} };
    });
  } else {
    byDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([iso, amount]) => ({ label: format(parseISO(iso), "MMM d"), date: iso, amount, cats: dayCatMap[iso] ?? {} }));
  }

  // ── Member contributions ─────────────────────────────────────────────────
  const memberPaid: Record<string, number> = {};
  const memberOwed: Record<string, number> = {};

  for (const { expense, splits } of expensesWithSplits) {
    memberPaid[expense.paidByMemberId] = r2((memberPaid[expense.paidByMemberId] ?? 0) + Number(expense.amount));
    for (const s of splits) {
      memberOwed[s.memberId] = r2((memberOwed[s.memberId] ?? 0) + Number(s.shareAmount));
    }
  }

  const byMember: MemberRow[] = members.map((m) => {
    const paid = memberPaid[m.id] ?? 0;
    const owed = memberOwed[m.id] ?? 0;
    return { memberId: m.id, name: m.displayName ?? m.guestName ?? "Member", paid, owed, net: r2(paid - owed) };
  }).sort((a, b) => b.paid - a.paid);

  // ── Payer counts (shared by highlights) ─────────────────────────────────
  const payerCounts: Record<string, number> = {};
  for (const e of expenseList) {
    payerCounts[e.paidByMemberId] = (payerCounts[e.paidByMemberId] ?? 0) + 1;
  }
  const topTabEntry = Object.entries(payerCounts).sort(([, a], [, b]) => b - a)[0];

  // ── Highlights ───────────────────────────────────────────────────────────
  // Quality guard: trip highlights require enough expenses to be non-trivial.
  // With < 3 expenses "biggest hit = 100% of trip" is a tautology, not insight.
  // Nests accumulate over months so their data quality check is different
  // (individual nest highlights each guard themselves on available data).
  const highlights: Highlight[] = [];
  const hasEnoughTripData = isNest || expenseList.length >= 3;

  if (!hasEnoughTripData) {
    // Return early with no highlights; everything else is still valid
  } else if (isNest) {
    // Nest highlight 1: Category mover (biggest absolute change vs last month)
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const thisCatMap: Record<string, number> = {};
    const lastCatMap: Record<string, number> = {};
    let thisMonthRecurring = 0;
    let thisMonthTotal = 0;

    for (const { expense } of expensesWithSplits) {
      const mk = expense.expenseDate.slice(0, 7);
      const amt = Number(expense.amount);
      if (mk === thisMonthKey) {
        thisCatMap[expense.category] = (thisCatMap[expense.category] ?? 0) + amt;
        thisMonthTotal += amt;
        if (expense.sourceTemplateId) thisMonthRecurring += amt;
      }
      if (mk === lastMonthKey) {
        lastCatMap[expense.category] = (lastCatMap[expense.category] ?? 0) + amt;
      }
    }

    const movers = Object.entries(thisCatMap)
      .filter(([cat]) => (lastCatMap[cat] ?? 0) > 0)
      .map(([cat, thisAmt]) => ({
        cat,
        thisAmt,
        lastAmt: lastCatMap[cat] ?? 0,
        delta: thisAmt - (lastCatMap[cat] ?? 0),
      }))
      .filter((m) => Math.abs(m.delta) >= 100)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const topMover = movers[0];
    if (topMover) {
      const catLabel = getCategory(topMover.cat).label;
      const isUp = topMover.delta > 0;
      highlights.push({
        emoji: isUp ? "📈" : "📉",
        title: `${catLabel} ${isUp ? "up" : "down"} ${formatAmt(Math.abs(topMover.delta), currency)}`,
        sub: `vs last month · now ${formatAmt(topMover.thisAmt, currency)} this month`,
        accentColor: isUp ? "from-rose-400 to-red-500" : "from-emerald-400 to-teal-500",
      });
    }

    // Nest highlight 2: Recurring coverage this month
    if (thisMonthTotal > 0 && thisMonthRecurring > 0) {
      const recurringPct = Math.round((thisMonthRecurring / thisMonthTotal) * 100);
      highlights.push({
        emoji: "🔄",
        title: `${recurringPct}% from templates`,
        sub: `${formatAmt(thisMonthRecurring, currency)} scheduled · ${formatAmt(thisMonthTotal - thisMonthRecurring, currency)} adhoc`,
        accentColor: "from-cyan-400 to-teal-500",
      });
    }

    // Nest highlight 3: Biggest single expense
    if (biggestExpense) {
      const pct = Math.round((Number(biggestExpense.amount) / totalSpend) * 100);
      highlights.push({
        emoji: "💸",
        title: biggestExpense.description,
        sub: `Biggest single expense · ${formatAmt(Number(biggestExpense.amount), currency)} · ${pct}% of all time`,
        accentColor: "from-amber-400 to-orange-500",
      });
    }

    // Fallback: tab-picker if we still have < 3
    if (highlights.length < 3 && topTabEntry) {
      const [mid, count] = topTabEntry;
      const m = members.find((x) => x.id === mid);
      if (m) {
        highlights.push({
          emoji: "🧾",
          title: `${m.displayName ?? m.guestName ?? "A member"} covers most tabs`,
          sub: `Paid for ${count} of ${expenseList.length} expenses`,
          accentColor: "from-violet-400 to-purple-500",
        });
      }
    }

  } else {
    // Trip highlight 1: Biggest single expense
    if (biggestExpense) {
      const pct = Math.round((Number(biggestExpense.amount) / totalSpend) * 100);
      highlights.push({
        emoji: "💸",
        title: biggestExpense.description,
        sub: `Biggest hit · ${formatAmt(Number(biggestExpense.amount), currency)} · ${pct}% of the trip`,
        accentColor: "from-amber-400 to-orange-500",
      });
    }

    // Trip highlight 2: Peak spending day
    const peakDay = [...byDay].sort((a, b) => b.amount - a.amount)[0];
    if (peakDay && peakDay.amount > 0) {
      const pct = Math.round((peakDay.amount / totalSpend) * 100);
      highlights.push({
        emoji: "📅",
        title: `${peakDay.label} was the peak`,
        sub: `${formatAmt(peakDay.amount, currency)} · ${pct}% of the trip in one day`,
        accentColor: "from-cyan-400 to-teal-500",
      });
    }

    // Trip highlight 3: Tab-picker (most expenses by count)
    if (topTabEntry) {
      const [mid, count] = topTabEntry;
      const m = members.find((x) => x.id === mid);
      if (m && expenseList.length > 1) {
        highlights.push({
          emoji: "🧾",
          title: `${m.displayName ?? m.guestName ?? "A member"} ran the tab`,
          sub: `Paid for ${count} of ${expenseList.length} expenses · the group's go-to payer`,
          accentColor: "from-violet-400 to-purple-500",
        });
      }
    }
  }

  return {
    totalSpend, perPerson, dailyAverage,
    expenseCount: expenseList.length, tripDays,
    biggestExpense: { description: biggestExpense.description, amount: Number(biggestExpense.amount) },
    topCategory: byCategory[0] ?? null,
    currency,
    byCategory, byDay, byMember,
    highlights,
  };
}
