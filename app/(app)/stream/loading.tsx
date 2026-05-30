export default function StreamLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-32 h-8 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
        <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
      </div>
      {/* Net position cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-700/60" />
        <div className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-700/60" />
      </div>
      {/* Person list */}
      <div className="space-y-2">
        <div className="w-28 h-4 rounded bg-slate-200 dark:bg-slate-700/40" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        ))}
      </div>
    </div>
  );
}
