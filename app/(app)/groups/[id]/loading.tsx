import { Skeleton } from "@/components/shared/skeleton";

export default function GroupLoading() {
  return (
    <div>
      {/* Back link — desktop only */}
      <div className="hidden md:block mb-6">
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Hero card — gradient header + progress rows */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        {/* Gradient header band */}
        <div className="h-32 bg-gradient-to-br from-violet-500/30 to-purple-600/20 dark:from-violet-900/40 dark:to-purple-900/30 animate-pulse" />

        {/* Progress section */}
        <div className="px-5 py-4 space-y-3">
          {/* Cycle nav placeholder */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-6" />
          </div>
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          {/* Wallet balance row */}
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Action zone divider + row */}
        <div className="border-t border-slate-200/60 dark:border-slate-700/40 px-5 py-3">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>

      {/* Members chip grid card */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2.5 mb-4">
          <Skeleton className="w-6 h-6 rounded-md shrink-0" />
          <Skeleton className="h-3.5 w-20" />
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["w-14", "w-16", "w-20", "w-14", "w-20", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-8 rounded-xl ${w}`} />
          ))}
        </div>
      </div>

      {/* Wallet expenses card */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="w-6 h-6 rounded-md shrink-0" />
          <Skeleton className="h-3.5 w-28" />
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
        </div>
        <Skeleton className="h-3 w-40 mb-3" />
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
