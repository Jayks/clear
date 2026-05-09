import { getAllTripsInsightsData } from "@/lib/db/queries/insights";
import { KpiCard } from "@/components/insights/kpi-card";
import { SmartInsightCard } from "@/components/insights/smart-insight-card";
import { CategoryDonut } from "@/components/insights/category-donut";
import { TripsSpendBar } from "@/components/insights/trips-spend-bar";
import { AnimatedList } from "@/components/shared/animated-list";
import { BarChart2, MapPin } from "lucide-react";
import Link from "next/link";

export default async function AllInsightsPage() {
  const insights = await getAllTripsInsightsData();

  if (!insights || insights.tripCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-4" />
        <h2 className="text-lg text-slate-700 dark:text-slate-200 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
          No insights yet
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Create trips and add expenses to see your travel analytics.</p>
        <Link href="/trips"
          className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 shadow-md shadow-cyan-500/25 transition-all">
          <MapPin className="w-4 h-4" /> Go to trips
        </Link>
      </div>
    );
  }

  const primaryCurrency = insights.byTrip[0]?.currency ?? "INR";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: primaryCurrency, maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
          Your travel story
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Across all your trips</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total spent" value={fmt(insights.totalSpend)}
          numericValue={insights.totalSpend} currency={primaryCurrency} accent />
        <KpiCard label="Trips" value={String(insights.tripCount)}
          numericValue={insights.tripCount} />
        <KpiCard label="Expenses" value={String(insights.totalExpenses)}
          numericValue={insights.totalExpenses} />
        <KpiCard label="Companions" value={String(insights.uniqueCompanions)}
          numericValue={insights.uniqueCompanions} />
      </div>

      {/* Charts */}
      {insights.tripCount > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <TripsSpendBar data={insights.byTrip} />
          <CategoryDonut data={insights.topCategories} currency={primaryCurrency} />
        </div>
      )}
      {insights.tripCount === 1 && (
        <div className="mb-6 max-w-sm">
          <CategoryDonut data={insights.topCategories} currency={primaryCurrency} />
        </div>
      )}

      {/* Smart insights */}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        What stands out
      </h2>
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8" staggerMs={50}>
        {insights.smartInsights.map((s, i) => (
          <SmartInsightCard key={i} emoji={s.emoji} title={s.title} sub={s.sub} />
        ))}
      </AnimatedList>

      {/* Trip links */}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        Dive into a trip
      </h2>
      <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 gap-2" staggerMs={60}>
        {insights.byTrip.map((t) => (
          <Link key={t.tripId} href={`/trips/${t.tripId}/insights`}
            className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.expenseCount} expenses · {t.memberCount} members</p>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0"
              style={{ fontFamily: "var(--font-fraunces)" }}>
              {fmt(t.totalSpend)}
            </p>
          </Link>
        ))}
      </AnimatedList>
    </div>
  );
}
