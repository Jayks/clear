/**
 * Loading skeleton for /stream (Stream dashboard).
 * Mirrors the actual StreamDashboardClient structure:
 *   1. Sticky header: ← home | "Streams" (Fraunces, centered) | + button
 *   2. Net position cards (Owed to me · I owe)
 *   3. Person list rows (avatar + name/meta + amount)
 *   4. Activity feed section
 */
export default function StreamLoading() {
  return (
    <div className="animate-pulse">
      {/* Sticky header: 3-part layout matching StreamDashboardClient */}
      <div className="sticky top-0 z-40 -mx-6 -mt-6 mb-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-2 h-[52px]">
          {/* Left: back arrow + "Home" */}
          <div className="flex items-center gap-0.5 min-w-[44px]">
            <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="hidden sm:block w-8 h-3.5 rounded bg-slate-200 dark:bg-slate-700/60 ml-0.5" />
          </div>
          {/* Centre: "Streams" title */}
          <div className="flex-1 flex justify-center">
            <div className="w-20 h-4.5 rounded-md bg-slate-200 dark:bg-slate-700/60" />
          </div>
          {/* Right: + button */}
          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700/60 shrink-0" />
        </div>
      </div>

      {/* Net position cards — Owed to me / I owe */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass rounded-2xl px-4 py-4 space-y-2">
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-7 w-24 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
        </div>
        <div className="glass rounded-2xl px-4 py-4 space-y-2">
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
        </div>
      </div>

      {/* Person list — "Owed to me" section */}
      <div className="space-y-2 mb-6">
        <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700/40 mb-2" />
        {[0, 1].map((i) => (
          <div key={i} className="glass rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700/60 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-3 w-36 rounded bg-slate-200/70 dark:bg-slate-700/40" />
            </div>
            <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700/60 shrink-0" />
          </div>
        ))}
      </div>

      {/* Person list — "I owe" section */}
      <div className="space-y-2 mb-6">
        <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-700/40 mb-2" />
        {[0, 1].map((i) => (
          <div key={i} className="glass rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700/60 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-3 w-32 rounded bg-slate-200/70 dark:bg-slate-700/40" />
            </div>
            <div className="h-5 w-14 rounded bg-slate-200 dark:bg-slate-700/60 shrink-0" />
          </div>
        ))}
      </div>

      {/* Activity feed section */}
      <div className="space-y-2">
        <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700/40 mb-2" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/60 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-2.5 w-24 rounded bg-slate-200/70 dark:bg-slate-700/40" />
            </div>
            <div className="h-3 w-10 rounded bg-slate-200/70 dark:bg-slate-700/40 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
