import { Skeleton } from "@/components/shared/skeleton";

export default function AllInsightsLoading() {
  return (
    <div>
      {/* Title */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-xl px-4 py-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>

      {/* Smart insights section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <Skeleton className="h-3.5 w-32" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Dive into section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <Skeleton className="h-3.5 w-28" />
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
