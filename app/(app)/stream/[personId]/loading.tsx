/**
 * Loading skeleton for /stream/[personId] (person detail page).
 * Mirrors the actual StreamPersonPageClient structure:
 *   1. Sticky header: ← | person name (Fraunces, centered) | ⋯ menu
 *   2. Balance hero card — large net + confirmed/pending/disputed breakdown
 *   3. Spine view entries — bilateral timeline (left/right of spine)
 */
export default function StreamPersonLoading() {
  return (
    <div className="animate-pulse">
      {/* Sticky header — 3-part, mirrors per-person page exactly */}
      <div className="sticky top-0 z-40 -mx-6 -mt-6 mb-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-2 h-[52px]">
          {/* Left: ← back */}
          <div className="flex items-center gap-0.5 min-w-[44px]">
            <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700/60" />
          </div>
          {/* Centre: person name */}
          <div className="flex-1 flex justify-center">
            <div className="w-28 h-4.5 rounded-md bg-slate-200 dark:bg-slate-700/60" />
          </div>
          {/* Right: ⋯ menu */}
          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700/60 shrink-0" />
        </div>
      </div>

      {/* Balance hero — net amount + breakdown (confirmed / pending / disputed) */}
      <div className="glass rounded-2xl px-5 py-5 mb-6 space-y-3">
        {/* Label + badge row */}
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700/60" />
        </div>
        {/* Large net amount */}
        <div className="h-10 w-36 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
        {/* Breakdown: confirmed · pending · disputed */}
        <div className="flex gap-4 pt-1">
          <div className="space-y-0.5">
            <div className="h-2.5 w-16 rounded bg-slate-200/70 dark:bg-slate-700/40" />
            <div className="h-3.5 w-14 rounded bg-slate-200 dark:bg-slate-700/60" />
          </div>
          <div className="space-y-0.5">
            <div className="h-2.5 w-14 rounded bg-slate-200/70 dark:bg-slate-700/40" />
            <div className="h-3.5 w-12 rounded bg-slate-200 dark:bg-slate-700/60" />
          </div>
        </div>
        {/* Settle / Forgive action buttons */}
        <div className="flex gap-2 pt-1">
          <div className="flex-1 h-9 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-700/60 shrink-0" />
        </div>
      </div>

      {/* Spine view — timeline entries (simplified bilateral layout) */}
      <div className="space-y-2">
        {/* Date label */}
        <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-700/40 mb-2" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            {/* Left side (owed-to-me or empty) */}
            <div className={`flex-1 ${i % 2 === 0 ? "opacity-100" : "opacity-0"}`}>
              <div className="glass rounded-xl px-3 py-2.5 space-y-1">
                <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
                <div className="h-3 w-16 rounded bg-slate-200/70 dark:bg-slate-700/40" />
              </div>
            </div>
            {/* Spine dot */}
            <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
            {/* Right side (i-owe or empty) */}
            <div className={`flex-1 ${i % 2 === 1 ? "opacity-100" : "opacity-0"}`}>
              <div className="glass rounded-xl px-3 py-2.5 space-y-1">
                <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
                <div className="h-3 w-16 rounded bg-slate-200/70 dark:bg-slate-700/40" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
