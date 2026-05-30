"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Home, BarChart2, PieChart, Users, User } from "lucide-react";
import { parseISO, format, differenceInDays } from "date-fns";
import { KpiCard } from "./kpi-card";
import { HighlightsStrip } from "./highlights-strip";
import { CategoryDonut } from "./category-donut";
import { TripsSpendBar } from "./trips-spend-bar";
import { MonthlySpendBar } from "./monthly-spend-bar";
import { CrossTabCard } from "./cross-tab-card";
import { AnimatedList } from "@/components/shared/animated-list";
import { FadeIn } from "@/components/shared/fade-in";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AllTripsInsights, TripSummary } from "@/lib/insights/all-trips-insights";
import type { AllNestsInsights, NestSummary } from "@/lib/insights/all-nests-insights";
import type { PersonalInsights } from "@/lib/insights/personal-insights";
import { PersonalContent, PersonalPlusGate } from "@/components/insights/personal-content";

export interface StreamNetSummary {
  owedToMe: number;
  iOwe:     number;
  currency: string;
}

interface Props {
  tripsData:       AllTripsInsights | null;
  nestsData:       AllNestsInsights | null;
  primaryCurrency: string;
  personalData:    PersonalInsights | null;
  isPlusUser:      boolean;
  streamSummary?:  StreamNetSummary;
}

// Vivid per-trip gradient palette — cycles through for the drill-down link icons
const TRIP_GRADIENTS = [
  "from-cyan-500 to-teal-500",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-green-500",
  "from-rose-500 to-pink-500",
  "from-blue-500 to-indigo-500",
  "from-fuchsia-500 to-violet-500",
  "from-teal-500 to-emerald-500",
];

// Amber section header — consistent with per-group insights page + design system
function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
      </div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/70 to-transparent dark:from-amber-800/40 dark:to-transparent" />
    </div>
  );
}

export function InsightsTabs({ tripsData, nestsData, primaryCurrency, personalData, isPlusUser, streamSummary }: Props) {
  const hasTrips = tripsData && tripsData.tripCount > 0;
  const hasNests = nestsData && nestsData.nestCount > 0;
  const showTabs = hasTrips || hasNests; // always show tabs when we have any data

  const defaultTab = hasTrips ? "trips" : hasNests ? "nests" : "you";
  const [activeTab, setActiveTab] = useState<"trips" | "nests" | "you">(defaultTab);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: primaryCurrency, maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      {/* Cross-tab comparison — only when user has both types */}
      {showTabs && tripsData && nestsData && (
        <CrossTabCard tripsData={tripsData} nestsData={nestsData} currency={primaryCurrency} />
      )}

      {/* Tab switcher — always shown, 3 tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
        {([
          hasTrips  && { key: "trips", icon: MapPin, label: "Trips" },
          hasNests  && { key: "nests", icon: Home,   label: "Nests" },
          { key: "you", icon: User, label: "You" },
        ].filter(Boolean) as { key: string; icon: React.ElementType; label: string }[]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as "trips" | "nests" | "you")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === key
                ? key === "you"
                  ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm"
                  : "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content — animated cross-fade */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "trips" && hasTrips && tripsData ? (
          <motion.div
            key="trips"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <TripsContent data={tripsData} fmt={fmt} primaryCurrency={primaryCurrency} />
          </motion.div>
        ) : activeTab === "nests" && hasNests && nestsData ? (
          <motion.div
            key="nests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <NestsContent data={nestsData} fmt={fmt} />
          </motion.div>
        ) : activeTab === "you" ? (
          <motion.div
            key="you"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {!isPlusUser ? (
              <PersonalPlusGate />
            ) : personalData ? (
              <PersonalContent data={personalData} streamSummary={streamSummary} />
            ) : (
              <YouEmptyState />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── Trips content ─────────────────────────────────────────────────────────────

function TripsContent({
  data,
  fmt,
  primaryCurrency,
}: {
  data: AllTripsInsights;
  fmt: (n: number) => string;
  primaryCurrency: string;
}) {
  // Build narrative meta-line
  const firstDatedTrip = data.byTrip.find((t) => t.startDate);
  const sinceYear = firstDatedTrip?.startDate?.slice(0, 4) ?? null;
  const metaParts = [
    `${data.tripCount} trip${data.tripCount !== 1 ? "s" : ""}`,
    data.totalDays > 0 ? `${data.totalDays} days on the road` : null,
    sinceYear ? `since ${sinceYear}` : null,
  ].filter(Boolean);

  return (
    <div>
      {/* Narrative header */}
      <div className="mb-6">
        <h1
          className="text-3xl text-slate-800 dark:text-slate-100"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Your travel story
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {metaParts.join(" · ")}
        </p>
      </div>

      {/* KPIs */}
      <AnimatedList
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        staggerMs={80}
        data-tour="trip-kpis"
      >
        <KpiCard
          label="Total spent"
          value={fmt(data.totalSpend)}
          numericValue={data.totalSpend}
          currency={primaryCurrency}
          accent
        />
        <KpiCard
          label="Trips"
          value={String(data.tripCount)}
          numericValue={data.tripCount}
          sub={data.avgTripCost > 0 ? `avg ${fmt(data.avgTripCost)} each` : undefined}
        />
        <KpiCard
          label="Days on road"
          value={data.totalDays > 0 ? String(data.totalDays) : "—"}
          numericValue={data.totalDays > 0 ? data.totalDays : undefined}
          sub={data.totalDays > 0 ? "across all trips" : "add trip dates"}
        />
        <KpiCard
          label="Companions"
          value={String(data.uniqueCompanions)}
          numericValue={data.uniqueCompanions}
          sub="travel mates"
        />
      </AnimatedList>

      {/* Highlights strip */}
      {data.highlights.length > 0 && (
        <FadeIn className="mb-6">
          <HighlightsStrip highlights={data.highlights} />
        </FadeIn>
      )}

      {/* Breakdown charts */}
      <FadeIn>
        <SectionHeader icon={PieChart} label="Breakdown" />
        <TripsBreakdownCharts data={data} primaryCurrency={primaryCurrency} />
      </FadeIn>

      {/* Per-trip drill-down links */}
      <FadeIn>
        <SectionHeader icon={MapPin} label="Dive into a trip" />
        <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 gap-2" staggerMs={60}>
          {data.byTrip.map((t, i) => (
            <TripLinkCard key={t.tripId} trip={t} index={i} fmt={fmt} />
          ))}
        </AnimatedList>
      </FadeIn>
    </div>
  );
}

/**
 * Renders spend-per-trip bar charts grouped by currency, so trips in different
 * currencies are never compared on the same axis.
 *
 * - 1 currency, 1 trip  → CategoryDonut only (no bar chart)
 * - 1 currency, 2+ trips → TripsSpendBar + CategoryDonut side-by-side
 * - 2+ currencies        → one TripsSpendBar per currency (full-width stacked),
 *                          then CategoryDonut full-width below
 */
function TripsBreakdownCharts({
  data,
  primaryCurrency,
}: {
  data: AllTripsInsights;
  primaryCurrency: string;
}) {
  // Group trips by currency, preserving chronological order within each group
  const currencyGroups: { currency: string; trips: TripSummary[] }[] = [];
  const seen = new Set<string>();
  for (const t of data.byTrip) {
    if (!seen.has(t.currency)) {
      seen.add(t.currency);
      currencyGroups.push({ currency: t.currency, trips: [] });
    }
    currencyGroups.find((g) => g.currency === t.currency)!.trips.push(t);
  }

  const isMultiCurrency = currencyGroups.length > 1;
  const hasMultipleTrips = data.tripCount > 1;

  if (!isMultiCurrency) {
    // Single currency — side-by-side layout
    return (
      <div
        className={`grid gap-4 mb-8 ${hasMultipleTrips ? "grid-cols-1 md:grid-cols-2" : ""}`}
        data-tour="all-insights-trips"
      >
        {hasMultipleTrips && (
          <TripsSpendBar data={data.byTrip} currency={primaryCurrency} />
        )}
        <div className={!hasMultipleTrips ? "max-w-sm" : ""}>
          <CategoryDonut data={data.topCategories} currency={primaryCurrency} />
        </div>
      </div>
    );
  }

  // Multi-currency — one bar chart per currency, stacked, then category donut
  return (
    <div className="space-y-4 mb-8" data-tour="all-insights-trips">
      {/* Per-currency bar charts */}
      <div className={`grid gap-4 ${currencyGroups.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        {currencyGroups.map(({ currency, trips }) => (
          <TripsSpendBar
            key={currency}
            data={trips}
            currency={currency}
            title={`Spend per trip · ${currency}`}
          />
        ))}
      </div>
      {/* Category donut spans full width when currencies are mixed
          (percentages are more defensible across currencies than raw amounts) */}
      <div className="max-w-sm">
        <CategoryDonut data={data.topCategories} currency={primaryCurrency} />
      </div>
    </div>
  );
}

function TripLinkCard({
  trip,
  index,
  fmt,
}: {
  trip: TripSummary;
  index: number;
  fmt: (n: number) => string;
}) {
  const gradient = TRIP_GRADIENTS[index % TRIP_GRADIENTS.length];

  // Build subtitle: "May 2024 · 5 days · 4 members" or "18 expenses · 4 members"
  const parts: string[] = [];
  if (trip.startDate) {
    parts.push(format(parseISO(trip.startDate), "MMM yyyy"));
  }
  if (trip.startDate && trip.endDate) {
    const days = differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1;
    parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  }
  if (!trip.startDate) {
    parts.push(`${trip.expenseCount} expenses`);
  }
  parts.push(`${trip.memberCount} member${trip.memberCount !== 1 ? "s" : ""}`);
  const subtitle = parts.join(" · ");

  const tripFmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: trip.currency,
    maximumFractionDigits: 0,
  }).format(trip.totalSpend);

  return (
    <Link
      href={`/groups/${trip.tripId}/insights`}
      className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group"
    >
      <div
        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform`}
      >
        <MapPin className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{trip.name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
      </div>
      <p
        className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {tripFmt}
      </p>
    </Link>
  );
}

// ── Nests content ─────────────────────────────────────────────────────────────

function NestsContent({
  data,
  fmt,
}: {
  data: AllNestsInsights;
  fmt: (n: number) => string;
}) {
  const nestCurrency = data.currency;
  // Narrative subtitle: "since Jan '24 · ₹X/mo average"
  const firstMonth = data.monthlyTrend[0];
  const sinceLabel = firstMonth
    ? (() => {
        const [y, m] = firstMonth.month.split("-");
        return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", {
          month: "short",
          year: "numeric",
        });
      })()
    : null;
  const metaParts = [
    `${data.nestCount} nest${data.nestCount !== 1 ? "s" : ""}`,
    sinceLabel ? `since ${sinceLabel}` : null,
    data.monthlyAverage > 0 ? `${fmt(data.monthlyAverage)}/mo average` : null,
  ].filter(Boolean);

  // MoM % for accent KPI sub-label
  const trend = data.monthlyTrend;
  const lastEntry = trend[trend.length - 1];
  const prevEntry = trend[trend.length - 2];
  const momPct =
    lastEntry && prevEntry && prevEntry.amount > 0
      ? Math.round(((lastEntry.amount - prevEntry.amount) / prevEntry.amount) * 100)
      : null;
  const momSub =
    momPct !== null
      ? `${momPct >= 0 ? "+" : ""}${momPct}% vs ${prevEntry?.label ?? "last month"}`
      : undefined;

  // Recurring per month for KPI
  const recurringPerMonth =
    trend.length > 0
      ? Math.round(data.recurringTotal / trend.length)
      : 0;

  return (
    <div>
      {/* Narrative header */}
      <div className="mb-6">
        <h1
          className="text-3xl text-slate-800 dark:text-slate-100"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Your household story
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {metaParts.join(" · ")}
        </p>
      </div>

      {/* KPIs */}
      <AnimatedList className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" staggerMs={80}>
        <KpiCard
          label="Monthly average"
          value={fmt(data.monthlyAverage)}
          numericValue={data.monthlyAverage}
          currency={nestCurrency}
          accent
          sub={momSub}
        />
        <KpiCard
          label="Total spend"
          value={fmt(data.totalSpend)}
          numericValue={data.totalSpend}
          currency={nestCurrency}
          sub={`${data.totalExpenses} expenses`}
        />
        <KpiCard
          label="Recurring/mo"
          value={recurringPerMonth > 0 ? fmt(recurringPerMonth) : "—"}
          numericValue={recurringPerMonth > 0 ? recurringPerMonth : undefined}
          currency={nestCurrency}
          sub={data.recurringPct > 0 ? `${data.recurringPct}% from templates` : "no templates yet"}
        />
        <KpiCard
          label="Mates"
          value={String(data.uniqueMates)}
          numericValue={data.uniqueMates}
          sub="housemates"
        />
      </AnimatedList>

      {/* Highlights strip */}
      {data.highlights.length > 0 && (
        <FadeIn className="mb-6">
          <HighlightsStrip highlights={data.highlights} />
        </FadeIn>
      )}

      {/* Charts */}
      <FadeIn>
        <SectionHeader icon={PieChart} label="Breakdown" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <MonthlySpendBar data={data.monthlyTrend} currency={nestCurrency} />
          <CategoryDonut data={data.topCategories} currency={nestCurrency} />
        </div>
      </FadeIn>

      {/* Per-nest links */}
      <FadeIn>
        <SectionHeader icon={Home} label="Dive into a nest" />
        <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 gap-2" staggerMs={60}>
          {data.byNest.map((n, i) => (
            <NestLinkCard key={n.nestId} nest={n} index={i} fmt={fmt} />
          ))}
        </AnimatedList>
      </FadeIn>
    </div>
  );
}

// ── You empty state ───────────────────────────────────────────────────────

function YouEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/25">
        <User className="w-6 h-6 text-white" />
      </div>
      <p className="text-base text-slate-700 dark:text-slate-200 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        No personal data yet
      </p>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
        Add expenses to your groups and your personal financial picture will appear here.
      </p>
    </div>
  );
}

const NEST_GRADIENTS = [
  "from-teal-500 to-emerald-500",
  "from-emerald-500 to-green-500",
  "from-cyan-500 to-teal-600",
  "from-green-500 to-teal-500",
];

function NestLinkCard({
  nest,
  index,
  fmt,
}: {
  nest: NestSummary;
  index: number;
  fmt: (n: number) => string;
}) {
  const gradient = NEST_GRADIENTS[index % NEST_GRADIENTS.length];
  const nestFmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: nest.currency,
    maximumFractionDigits: 0,
  }).format(nest.totalSpend);

  return (
    <Link
      href={`/groups/${nest.nestId}/insights`}
      className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group"
    >
      <div
        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform`}
      >
        <Home className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{nest.name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {fmt(nest.monthlyAverage)}/mo · {nest.memberCount} member{nest.memberCount !== 1 ? "s" : ""}
        </p>
      </div>
      <p
        className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {nestFmt}
      </p>
    </Link>
  );
}
