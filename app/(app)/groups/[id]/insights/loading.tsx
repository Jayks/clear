import { Skeleton } from "@/components/shared/skeleton";

export default function InsightsLoading() {
  return (
    <div>
      {/* Desktop header: Back · icon · title + meta · share link */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <Skeleton className="h-4 w-14 rounded" />
        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-7 w-24 mb-1.5 rounded-lg" />
          <Skeleton className="h-3 w-52 rounded" />
        </div>
        <Skeleton className="h-4 w-24 rounded ml-auto" />
      </div>

      {/* Mobile meta-line */}
      <Skeleton className="md:hidden h-3.5 w-48 mb-3 rounded" />

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Accent card */}
        <div className="rounded-xl px-4 py-4 bg-gradient-to-br from-amber-500/25 to-orange-400/20 space-y-2">
          <Skeleton className="h-3 w-20 bg-white/20 dark:bg-white/10" />
          <Skeleton className="h-7 w-28 bg-white/25 dark:bg-white/15" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-xl px-4 py-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>

      {/* Highlights strip — 3 vivid cards */}
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
            <Skeleton className="h-2.5 w-3/5 rounded" />
          </div>
        ))}
      </div>

      {/* Pace tracker card */}
      <div className="glass rounded-2xl p-5 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-end gap-6">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
          <div className="space-y-1 pb-0.5">
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full mt-2" />
      </div>

      {/* Breakdown section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Skeleton className="w-3.5 h-3.5 rounded" />
        </div>
        <Skeleton className="h-3.5 w-20 rounded" />
        <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/50 to-transparent dark:from-amber-800/30 dark:to-transparent" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>

      {/* Group dynamics section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Skeleton className="w-3.5 h-3.5 rounded" />
        </div>
        <Skeleton className="h-3.5 w-28 rounded" />
        <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/50 to-transparent dark:from-amber-800/30 dark:to-transparent" />
      </div>

      {/* Group dynamics card */}
      <div className="glass rounded-2xl p-5 space-y-3">
        {/* Fairness score bar */}
        <div className="p-3.5 bg-white/30 dark:bg-slate-800/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        {/* Role rows */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5 py-0.5">
            <Skeleton className="w-7 h-7 rounded-full shrink-0" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-6 w-24 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
