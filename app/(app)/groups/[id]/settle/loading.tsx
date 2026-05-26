import { Skeleton } from "@/components/shared/skeleton";

export default function SettleLoading() {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="hidden md:block h-4 w-16" />
        <Skeleton className="h-7 w-24" />
      </div>

      {/* Balances section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <Skeleton className="h-3.5 w-20" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>

      {/* Suggested payments section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <Skeleton className="h-3.5 w-36" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
