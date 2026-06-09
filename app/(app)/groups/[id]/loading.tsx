import { Skeleton } from "@/components/shared/skeleton";

/**
 * Loading skeleton for /groups/[id] (trip/nest overview).
 * Mirrors the actual Trip/Nest page structure:
 *   1. Desktop-only back link
 *   2. Hero card — h-52 gradient/image with group name at bottom
 *   3. Quick actions 2×2 grid (Expenses · Settle Up · Members · Insights)
 *   4. Activity feed section
 */
export default function GroupLoading() {
  return (
    <div>
      {/* Desktop-only back link */}
      <div className="hidden md:block mb-6">
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Hero card — h-52, matches actual TripCard dashboard hero */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <div className="h-52 relative bg-gradient-to-br from-cyan-500/20 to-teal-500/15 dark:from-cyan-900/30 dark:to-teal-900/20 animate-pulse">
          {/* Legibility overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-slate-900/10 to-transparent" />
          {/* Group name + date row at bottom */}
          <div className="absolute bottom-4 left-5 right-5 space-y-1.5">
            <Skeleton className="h-7 w-48 bg-white/20 dark:bg-white/10" />
            <Skeleton className="h-3.5 w-32 bg-white/15 dark:bg-white/8" />
          </div>
        </div>
      </div>

      {/* Quick actions — 2-col on mobile, 4-col on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { w: "w-16", color: "from-cyan-500/20 to-teal-500/15 dark:from-cyan-900/30 dark:to-teal-900/20" },
          { w: "w-20", color: "from-emerald-500/20 to-green-500/15 dark:from-emerald-900/30 dark:to-green-900/20" },
          { w: "w-14", color: "from-violet-500/20 to-purple-500/15 dark:from-violet-900/30 dark:to-purple-900/20" },
          { w: "w-20", color: "from-amber-500/20 to-orange-500/15 dark:from-amber-900/30 dark:to-orange-900/20" },
        ].map((tile, i) => (
          <div key={i} className="glass rounded-xl p-4 flex items-center gap-3">
            <Skeleton className={`w-9 h-9 rounded-lg shrink-0 bg-gradient-to-br ${tile.color}`} />
            <div className="space-y-1.5 flex-1">
              <Skeleton className={`h-3.5 ${tile.w}`} />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Activity feed section */}
      <div className="glass rounded-2xl p-5">
        {/* Section header */}
        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="w-6 h-6 rounded-md shrink-0" />
          <Skeleton className="h-3.5 w-28" />
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
          <Skeleton className="h-3 w-12" />
        </div>
        {/* Activity rows — avatar + 2-line text + timestamp */}
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-1 py-2">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
