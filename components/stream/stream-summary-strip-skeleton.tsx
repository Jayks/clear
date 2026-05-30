/**
 * Skeleton for StreamSummaryStrip — matches the compact vertical-row layout.
 */
export function StreamSummaryStripSkeleton() {
  return (
    <div className="mb-5 animate-pulse">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700/60 shrink-0" />
        <div className="w-20 h-3.5 rounded bg-slate-200 dark:bg-slate-700/60" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/40" />
        <div className="w-14 h-3.5 rounded bg-slate-200 dark:bg-slate-700/60" />
      </div>
      {/* Person rows */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/60 shrink-0" />
          <div className="flex-1 h-3.5 rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="w-16 h-3.5 rounded bg-slate-200 dark:bg-slate-700/60 shrink-0" />
        </div>
      ))}
    </div>
  );
}
