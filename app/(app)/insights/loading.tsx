import { Skeleton } from "@/components/shared/skeleton";

/**
 * Loading skeleton for /insights (all-groups insights).
 * Mirrors the actual page structure:
 *   1. Page title + tagline
 *   2. Tab switcher (Trips · Nests · You)
 *   3. Tab content — Trips tab (default):
 *      - Opening heading
 *      - KPI row (4 cards, first is accent amber)
 *      - Highlights strip (3 vivid cards)
 *      - Charts area (TripsSpendBar + CategoryDonut)
 *      - Per-trip link cards
 */
export default function AllInsightsLoading() {
  return (
    <div>
      {/* Page title */}
      <div className="mb-5 space-y-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      {/* Tab switcher — Trips / Nests / You */}
      <div className="flex gap-1 p-1 glass rounded-xl mb-6">
        {/* Active tab */}
        <div className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/15 dark:from-cyan-900/30 dark:to-teal-900/20">
          <Skeleton className="h-3.5 w-10 mx-auto" />
        </div>
        <div className="flex-1 py-2 px-3 rounded-lg">
          <Skeleton className="h-3.5 w-12 mx-auto" />
        </div>
        <div className="flex-1 py-2 px-3 rounded-lg">
          <Skeleton className="h-3.5 w-8 mx-auto" />
        </div>
      </div>

      {/* Trips tab content */}

      {/* Opening heading */}
      <div className="mb-5 space-y-1.5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-64" />
      </div>

      {/* KPI grid — 4 cards, first is amber accent */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Accent card */}
        <div className="rounded-xl px-4 py-4 bg-gradient-to-br from-amber-500/25 to-orange-400/20 dark:from-amber-900/30 dark:to-orange-900/20 space-y-2">
          <Skeleton className="h-3 w-20 bg-white/20 dark:bg-white/10" />
          <Skeleton className="h-7 w-28 bg-white/25 dark:bg-white/15" />
          <Skeleton className="h-2.5 w-20 bg-white/15 dark:bg-white/8" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-xl px-4 py-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>

      {/* Highlights strip — 3 vivid gradient cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          "from-amber-400/20 to-orange-400/15",
          "from-cyan-400/20 to-teal-400/15",
          "from-violet-400/20 to-purple-400/15",
        ].map((grad, i) => (
          <div
            key={i}
            className={`glass rounded-2xl px-3 py-3 sm:px-4 sm:py-4 space-y-2 bg-gradient-to-br ${grad}`}
          >
            <Skeleton className="h-8 w-8 rounded-lg mb-1" />
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-2.5 w-4/5 rounded" />
          </div>
        ))}
      </div>

      {/* Charts — TripsSpendBar (large) + CategoryDonut (square) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>

      {/* Per-trip link cards */}
      <div className="flex items-center gap-2.5 mb-3">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <Skeleton className="h-3.5 w-24" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
