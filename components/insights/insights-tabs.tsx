"use client";

import { useState } from "react";
import { MapPin, Home, BarChart2 } from "lucide-react";
import { KpiCard } from "./kpi-card";
import { SmartInsightCard } from "./smart-insight-card";
import { CategoryDonut } from "./category-donut";
import { TripsSpendBar } from "./trips-spend-bar";
import { MonthlySpendBar } from "./monthly-spend-bar";
import { AnimatedList } from "@/components/shared/animated-list";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AllTripsInsights } from "@/lib/insights/all-trips-insights";
import type { AllNestsInsights } from "@/lib/insights/all-nests-insights";

interface Props {
  tripsData: AllTripsInsights | null;
  nestsData: AllNestsInsights | null;
  primaryCurrency: string;
}

export function InsightsTabs({ tripsData, nestsData, primaryCurrency }: Props) {
  const hasTrips = tripsData && tripsData.tripCount > 0;
  const hasNests = nestsData && nestsData.nestCount > 0;
  const showTabs = hasTrips && hasNests;

  const [activeTab, setActiveTab] = useState<"trips" | "nests">(hasTrips ? "trips" : "nests");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: primaryCurrency, maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      {/* Tab switcher — only shown when user has both types */}
      {showTabs && (
        <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
          {(["trips", "nests"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {tab === "trips"
                ? <><MapPin className="w-3.5 h-3.5" /> Trips</>
                : <><Home className="w-3.5 h-3.5" /> Nests</>}
            </button>
          ))}
        </div>
      )}

      {/* ── TRIPS CONTENT ──────────────────────────────────────────── */}
      {(!showTabs || activeTab === "trips") && hasTrips && (
        <TripsInsightsContent data={tripsData} fmt={fmt} primaryCurrency={primaryCurrency} />
      )}

      {/* ── NESTS CONTENT ──────────────────────────────────────────── */}
      {(!showTabs || activeTab === "nests") && hasNests && (
        <NestsInsightsContent data={nestsData} fmt={fmt} />
      )}
    </div>
  );
}

function TripsInsightsContent({ data, fmt, primaryCurrency }: {
  data: AllTripsInsights;
  fmt: (n: number) => string;
  primaryCurrency: string;
}) {
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
        <KpiCard label="Total spent" value={fmt(data.totalSpend)}
          numericValue={data.totalSpend} currency={primaryCurrency} accent />
        <KpiCard label="Trips" value={String(data.tripCount)}
          numericValue={data.tripCount} />
        <KpiCard label="Expenses" value={String(data.totalExpenses)}
          numericValue={data.totalExpenses} />
        <KpiCard label="Companions" value={String(data.uniqueCompanions)}
          numericValue={data.uniqueCompanions} />
      </div>

      {/* Charts */}
      {data.tripCount > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <TripsSpendBar data={data.byTrip} />
          <CategoryDonut data={data.topCategories} currency={primaryCurrency} />
        </div>
      )}
      {data.tripCount === 1 && (
        <div className="mb-6 max-w-sm">
          <CategoryDonut data={data.topCategories} currency={primaryCurrency} />
        </div>
      )}

      {/* Smart insights */}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        What stands out
      </h2>
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8" staggerMs={50}>
        {data.smartInsights.map((s, i) => (
          <SmartInsightCard key={i} emoji={s.emoji} title={s.title} sub={s.sub} />
        ))}
      </AnimatedList>

      {/* Per-trip links */}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        Dive into a trip
      </h2>
      <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 gap-2" staggerMs={60}>
        {data.byTrip.map((t) => (
          <Link key={t.tripId} href={`/groups/${t.tripId}/insights`}
            className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.expenseCount} expenses · {t.memberCount} members
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0"
              style={{ fontFamily: "var(--font-fraunces)" }}>
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: t.currency, maximumFractionDigits: 0 }).format(t.totalSpend)}
            </p>
          </Link>
        ))}
      </AnimatedList>
    </div>
  );
}

function NestsInsightsContent({ data, fmt }: {
  data: AllNestsInsights;
  fmt: (n: number) => string;
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
          Your household spending
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Across {data.nestCount} nest{data.nestCount > 1 ? "s" : ""}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Monthly average" value={fmt(data.monthlyAverage)}
          numericValue={data.monthlyAverage} currency="INR" accent />
        <KpiCard label="Total spend" value={fmt(data.totalSpend)}
          numericValue={data.totalSpend} currency="INR" />
        <KpiCard label="Expenses" value={String(data.totalExpenses)}
          numericValue={data.totalExpenses} />
        <KpiCard label="Housemates" value={String(data.uniqueHousemates)}
          numericValue={data.uniqueHousemates} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MonthlySpendBar data={data.monthlyTrend} currency="INR" />
        <CategoryDonut data={data.topCategories} currency="INR" />
      </div>

      {/* Smart insights */}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        What stands out
      </h2>
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8" staggerMs={50}>
        {data.smartInsights.map((s, i) => (
          <SmartInsightCard key={i} emoji={s.emoji} title={s.title} sub={s.sub} />
        ))}
      </AnimatedList>

      {/* Per-nest links */}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        Dive into a nest
      </h2>
      <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 gap-2" staggerMs={60}>
        {data.byNest.map((n) => (
          <Link key={n.nestId} href={`/groups/${n.nestId}/insights`}
            className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-sm shrink-0">
              <Home className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{n.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fmt(n.monthlyAverage)}/mo · {n.memberCount} members
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0"
              style={{ fontFamily: "var(--font-fraunces)" }}>
              {fmt(n.totalSpend)}
            </p>
          </Link>
        ))}
      </AnimatedList>
    </div>
  );
}
