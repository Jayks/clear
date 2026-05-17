import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/shared/skeleton";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getGroupExpensesWithSplits } from "@/lib/db/queries/expenses";
import { computeTripInsights } from "@/lib/insights/trip-insights";
import { computeGroupRoles } from "@/lib/insights/group-roles";
import { computeSpendTrajectory } from "@/lib/insights/cross-trip";
import { CrossTripSection } from "./cross-trip-section";
import { KpiCard } from "@/components/insights/kpi-card";
import { SmartInsightCard } from "@/components/insights/smart-insight-card";
import { GroupRolesCard } from "@/components/insights/group-roles-card";
import { PaceTrackerCard } from "@/components/insights/pace-tracker-card";
import { AnimatedList } from "@/components/shared/animated-list";
import { CategoryDonut } from "@/components/insights/category-donut";
import { DailySpendBar } from "@/components/insights/daily-spend-bar";
import { MonthlySpendBar } from "@/components/insights/monthly-spend-bar";
import type { MonthSpend } from "@/components/insights/monthly-spend-bar";
import { MemberContributions } from "@/components/insights/member-contributions";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { AdherenceCard } from "@/components/trip/adherence-card";
import Link from "next/link";

export default async function GroupInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tripData, expensesWithSplits] = await Promise.all([
    getGroupWithMembers(id, { full: true }),
    getGroupExpensesWithSplits(id),
  ]);
  if (!tripData) notFound();

  const { group, members } = tripData;
  const isNest = group.groupType === "nest";
  const insights = computeTripInsights({ trip: group, members, expensesWithSplits });
  const groupRoles = computeGroupRoles({ members, expensesWithSplits });
  const currency = group.defaultCurrency;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  // Nest: compute monthly spend data
  const monthlyData: MonthSpend[] = [];
  if (isNest && expensesWithSplits.length > 0) {
    const monthMap = new Map<string, { amount: number; recurring: number; adhoc: number }>();
    for (const { expense } of expensesWithSplits) {
      const key = expense.expenseDate.slice(0, 7); // YYYY-MM
      const existing = monthMap.get(key) ?? { amount: 0, recurring: 0, adhoc: 0 };
      const amt = Number(expense.amount);
      const isRecurring = !!expense.sourceTemplateId;
      monthMap.set(key, {
        amount: existing.amount + amt,
        recurring: existing.recurring + (isRecurring ? amt : 0),
        adhoc: existing.adhoc + (!isRecurring ? amt : 0),
      });
    }
    const sorted = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, val] of sorted) {
      const [year, month] = key.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      const label = date.toLocaleString("en-IN", { month: "short" }) + " '" + String(year).slice(2);
      monthlyData.push({ label, month: key, ...val });
    }
  }

  // Nest: this month KPIs
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = monthlyData.find((m) => m.month === thisMonthKey);
  const lastMonth = monthlyData.find((m) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return m.month === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Trip: trajectory + cross-group
  const trajectory = !isNest ? computeSpendTrajectory({
    totalSpend: insights.totalSpend,
    startDate: group.startDate,
    endDate: group.endDate,
    budget: group.budget ? Number(group.budget) : null,
  }) : null;

  const perPersonDaily = !isNest && insights.tripDays > 0
    ? Math.round(insights.perPerson / insights.tripDays)
    : 0;

  if (expensesWithSplits.length === 0) {
    return (
      <div>
        <Link href={`/groups/${id}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-4" />
          <h2 className="text-lg text-slate-700 dark:text-slate-200 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
            No expenses yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Add some expenses and come back for insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/groups/${id}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
            Insights
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{group.name}</p>
        </div>
      </div>

      {/* KPIs — trip: total/per-person/daily/count | nest: this month/last month/per person/total */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-tour="trip-kpis">
        {isNest ? (
          <>
            <KpiCard label="This month" value={fmt(thisMonth?.amount ?? 0)}
              numericValue={thisMonth?.amount ?? 0} currency={currency} accent />
            <KpiCard label="Last month" value={fmt(lastMonth?.amount ?? 0)}
              numericValue={lastMonth?.amount ?? 0} currency={currency} />
            <KpiCard label="Per person" value={fmt(insights.perPerson / Math.max(monthlyData.length, 1))}
              numericValue={insights.perPerson} currency={currency} />
            <KpiCard label="All time" value={fmt(insights.totalSpend)}
              numericValue={insights.totalSpend} currency={currency}
              sub={`${insights.expenseCount} expenses`} />
          </>
        ) : (
          <>
            <KpiCard label="Total spend" value={fmt(insights.totalSpend)}
              numericValue={insights.totalSpend} currency={currency} accent />
            <KpiCard label="Per person" value={fmt(insights.perPerson)}
              numericValue={insights.perPerson} currency={currency} />
            <KpiCard label="Daily average" value={fmt(insights.dailyAverage)}
              numericValue={insights.dailyAverage} currency={currency} />
            <KpiCard label="Expenses" value={String(insights.expenseCount)}
              numericValue={insights.expenseCount}
              sub={`over ${insights.tripDays} day${insights.tripDays > 1 ? "s" : ""}`} />
          </>
        )}
      </div>

      {/* Pace tracker — trip only */}
      {!isNest && trajectory && (
        <PaceTrackerCard data={trajectory} currency={currency} />
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6" data-tour="trip-charts">
        <CategoryDonut data={insights.byCategory} currency={currency} />
        {isNest
          ? <MonthlySpendBar data={monthlyData} currency={currency} />
          : <DailySpendBar data={insights.byDay} currency={currency} />
        }
        <MemberContributions data={insights.byMember} currency={currency} />
      </div>

      <div className="mb-6">
        <GroupRolesCard data={groupRoles} />
      </div>

      {/* Cross-group comparison — trip only, streams in after main charts */}
      {!isNest && (
        <Suspense fallback={<Skeleton className="h-24 rounded-xl mb-6" />}>
          <CrossTripSection
            groupId={id}
            totalSpend={insights.totalSpend}
            memberCount={members.length}
            tripDays={insights.tripDays}
            currency={currency}
            topCategory={insights.topCategory?.category ?? null}
            topCategoryPct={insights.topCategory?.percentage ?? 0}
            perPersonDaily={perPersonDaily}
          />
        </Suspense>
      )}

      {/* Plan vs Reality — trip only */}
      {!isNest && group.itinerary && (
        <AdherenceCard
          itinerary={group.itinerary}
          expenses={expensesWithSplits.map(({ expense }) => ({
            description: expense.description,
            expenseDate: expense.expenseDate,
          }))}
        />
      )}

      {/* Smart insights */}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        Smart insights
      </h2>
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" staggerMs={50}>
        {insights.smartInsights.map((s, i) => (
          <SmartInsightCard key={i} emoji={s.emoji} title={s.title} sub={s.sub} />
        ))}
      </AnimatedList>
    </div>
  );
}
