export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title */}
      <div>
        <div className="h-7 w-52 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
        <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 mb-3" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
            <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>

      {/* User hierarchy */}
      <div>
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/50 dark:border-slate-700/40">
                <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-5 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="px-5 py-4">
                <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Groups table */}
      <div>
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="glass rounded-2xl overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-slate-100/60 dark:border-slate-700/40 last:border-0">
              <div className="h-4 flex-1 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-4 w-8 bg-slate-100 dark:bg-slate-800 rounded hidden sm:block" />
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
