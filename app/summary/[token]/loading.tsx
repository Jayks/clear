/**
 * Loading skeleton for /summary/[token] (public trip summary page).
 * Mirrors the actual SummaryPage structure:
 *   1. Minimal nav — logo left, "Get started →" right (unauthenticated)
 *   2. Hero — h-64 cover photo + trip name
 *   3. Stats row (KPI cards)
 *   4. Timeline section
 */
export default function SummaryLoading() {
  return (
    <div className="min-h-screen pb-16 animate-pulse">
      {/* Minimal nav */}
      <div className="glass-nav sticky top-0 z-10 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700/60" />
        </div>
        <div className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
        {/* Hero */}
        <div className="glass rounded-3xl overflow-hidden mb-6">
          <div className="h-64 relative bg-slate-200 dark:bg-slate-700/60">
            <div className="absolute bottom-5 left-6 right-6 space-y-2">
              <div className="h-8 w-1/2 rounded-md bg-white/40 dark:bg-slate-400/30" />
              <div className="h-3.5 w-1/3 rounded bg-white/30 dark:bg-slate-400/20" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 space-y-2">
              <div className="h-2.5 w-14 rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-6 w-16 rounded-md bg-slate-200 dark:bg-slate-700/60" />
            </div>
          ))}
        </div>

        {/* Timeline section */}
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700/60" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 space-y-2">
              <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-3 w-full rounded bg-slate-200/70 dark:bg-slate-700/40" />
              <div className="h-3 w-2/3 rounded bg-slate-200/70 dark:bg-slate-700/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
