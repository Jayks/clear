import { Skeleton } from "@/components/shared/skeleton";

/**
 * Loading skeleton for /groups (Home page).
 * Mirrors the actual page structure:
 *   1. HomeGreeting
 *   2. Active / Archived underline-tab toggle
 *   3. SectionPillNav (Trips · Nests · Circles pills)
 *   4. Trips section header + card grid
 *   5. Nests section header + card grid
 */
export default function TripsLoading() {
  return (
    <div>
      {/* HomeGreeting — emoji + name in Fraunces text-2xl */}
      <div className="mb-5">
        <Skeleton className="h-8 w-56 rounded-lg" />
      </div>

      {/* Active / Archived underline-tab toggle */}
      <div className="flex items-center gap-6 mb-4 border-b border-slate-200 dark:border-slate-700/50">
        {/* "Active" tab — active state underline */}
        <div className="flex flex-col gap-1 pb-2">
          <Skeleton className="h-4 w-14" />
          <div className="h-[2px] rounded-full bg-cyan-500/40" />
        </div>
        <Skeleton className="h-4 w-16 mb-2" />
      </div>

      {/* SectionPillNav — sticky pill row */}
      <div className="flex items-center gap-2 mb-5">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-18 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* Trips section */}
      <div className="mb-8" id="trips">
        {/* Section header: icon badge + label + gradient rule + + button */}
        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="w-6 h-6 rounded-md shrink-0" />
          <Skeleton className="h-4 w-16" />
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
          <Skeleton className="h-7 w-24 rounded-xl" />
        </div>
        {/* Trip card grid — 4 cards with h-44 image area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl overflow-hidden shadow-md shadow-cyan-500/10">
              {/* h-44 image placeholder */}
              <Skeleton className="h-44 rounded-none" />
              {/* Balance badge strip */}
              <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nests section */}
      <div id="nests">
        {/* Section header */}
        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="w-6 h-6 rounded-md shrink-0" />
          <Skeleton className="h-4 w-14" />
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
          <Skeleton className="h-7 w-24 rounded-xl" />
        </div>
        {/* Nest card grid — 2 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl overflow-hidden shadow-md shadow-emerald-500/10">
              <Skeleton className="h-44 rounded-none" />
              <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
