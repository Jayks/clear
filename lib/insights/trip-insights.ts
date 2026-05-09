import { eachDayOfInterval, parseISO, format, differenceInDays } from "date-fns";
import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import type { Trip } from "@/lib/db/schema/trips";
import type { TripMember } from "@/lib/db/schema/trip-members";
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
}

export interface MemberRow {
  name: string;
  paid: number;
  owed: number;
  net: number;
}

export interface SmartInsight {
  emoji: string;
  title: string;
  sub: string;
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
  smartInsights: SmartInsight[];
}

function r2(n: number) { return Math.round(n * 100) / 100; }

export function computeTripInsights(params: {
  trip: Trip;
  members: TripMember[];
  expensesWithSplits: { expense: Expense; splits: ExpenseSplit[] }[];
}): TripInsights {
  const { trip, members, expensesWithSplits } = params;
  const currency = trip.defaultCurrency;
  const expenseList = expensesWithSplits.map((e) => e.expense);

  if (expenseList.length === 0) {
    return {
      totalSpend: 0, perPerson: 0, dailyAverage: 0,
      expenseCount: 0, tripDays: 1, biggestExpense: null,
      topCategory: null, currency,
      byCategory: [], byDay: [], byMember: [], smartInsights: [],
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
  for (const e of expenseList) {
    dayMap[e.expenseDate] = r2((dayMap[e.expenseDate] ?? 0) + Number(e.amount));
  }

  let byDay: DaySpend[];
  if (trip.startDate && trip.endDate) {
    // Fill every day in the range, zero if no expenses
    byDay = eachDayOfInterval({ start: parseISO(trip.startDate), end: parseISO(trip.endDate) }).map((d) => {
      const iso = format(d, "yyyy-MM-dd");
      return { label: format(d, "MMM d"), date: iso, amount: dayMap[iso] ?? 0 };
    });
  } else {
    byDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([iso, amount]) => ({ label: format(parseISO(iso), "MMM d"), date: iso, amount }));
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
    return { name: m.guestName ?? "You", paid, owed, net: r2(paid - owed) };
  }).sort((a, b) => b.paid - a.paid);

  // ── Smart insights ───────────────────────────────────────────────────────
  const smartInsights: SmartInsight[] = [];

  // 1. Top category dominance
  const top = byCategory[0];
  if (top) {
    smartInsights.push({
      emoji: "🏆",
      title: `${top.label} led the spend`,
      sub: `${top.percentage}% of the budget — ${formatAmt(top.amount, currency)}`,
    });
  }

  // 2. Biggest single expense
  if (biggestExpense) {
    const pct = Math.round((Number(biggestExpense.amount) / totalSpend) * 100);
    smartInsights.push({
      emoji: "💸",
      title: biggestExpense.description,
      sub: `Single biggest expense — ${pct}% of the total trip cost`,
    });
  }

  // 3. Peak spending day
  const peakDay = [...byDay].sort((a, b) => b.amount - a.amount)[0];
  if (peakDay && peakDay.amount > 0) {
    const pct = Math.round((peakDay.amount / totalSpend) * 100);
    smartInsights.push({
      emoji: "📅",
      title: `${peakDay.label} was the big day`,
      sub: `${formatAmt(peakDay.amount, currency)} spent — ${pct}% of the trip in one day`,
    });
  }

  // 4. Most generous payer (by amount)
  const topPayer = byMember[0];
  if (topPayer && topPayer.paid > 0) {
    const payerPct = Math.round((topPayer.paid / totalSpend) * 100);
    smartInsights.push({
      emoji: "🙌",
      title: `${topPayer.name} covered the most`,
      sub: `Paid ${formatAmt(topPayer.paid, currency)} — ${payerPct}% of total group spend`,
    });
  }

  // 5. Most active payer (by expense count)
  const payerCounts: Record<string, number> = {};
  for (const e of expenseList) payerCounts[e.paidByMemberId] = (payerCounts[e.paidByMemberId] ?? 0) + 1;
  const topPayerByCount = Object.entries(payerCounts).sort(([, a], [, b]) => b - a)[0];
  if (topPayerByCount) {
    const [memberId, count] = topPayerByCount;
    const payerMember = members.find((m) => m.id === memberId);
    if (payerMember) {
      smartInsights.push({
        emoji: "🧾",
        title: `${payerMember.guestName ?? "You"} picked up the tab most`,
        sub: `Paid for ${count} of the ${expenseList.length} expenses`,
      });
    }
  }

  // 6. Split mode habits
  const splitCounts: Record<string, number> = {};
  for (const { splits } of expensesWithSplits) {
    const mode = splits[0]?.splitType ?? "equal";
    splitCounts[mode] = (splitCounts[mode] ?? 0) + 1;
  }
  const equalCount = splitCounts["equal"] ?? 0;
  const equalPct = Math.round((equalCount / expenseList.length) * 100);
  smartInsights.push({
    emoji: equalPct >= 70 ? "⚖️" : "🎯",
    title: equalPct >= 70 ? "A fair-minded group" : "Mixed splitting styles",
    sub: `${equalPct}% of expenses split equally${equalPct < 70 ? " — custom splits used often" : ""}`,
  });

  // 7. Per person per day
  smartInsights.push({
    emoji: "📊",
    title: `${formatAmt(r2(perPerson / tripDays), currency)} per person per day`,
    sub: `Over ${tripDays} day${tripDays > 1 ? "s" : ""} for ${members.length} people`,
  });

  return {
    totalSpend, perPerson, dailyAverage,
    expenseCount: expenseList.length, tripDays,
    biggestExpense: { description: biggestExpense.description, amount: Number(biggestExpense.amount) },
    topCategory: byCategory[0] ?? null,
    currency,
    byCategory, byDay, byMember,
    smartInsights,
  };
}

function formatAmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
