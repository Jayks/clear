export default function StreamPersonLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Back nav */}
      <div className="w-24 h-6 rounded bg-slate-200 dark:bg-slate-700/40" />
      {/* Balance hero */}
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700/60" />
      {/* Timeline entries */}
      <div className="space-y-2 mt-4">
        <div className="w-20 h-4 rounded bg-slate-200 dark:bg-slate-700/40" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        ))}
      </div>
    </div>
  );
}
