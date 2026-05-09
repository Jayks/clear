import { Skeleton } from "@/components/shared/skeleton";

export default function AllInsightsLoading() {
  return (
    <div className="max-w-5xl">
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

      {/* Smart insights */}
      <Skeleton className="h-4 w-28 mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      {/* Trip links */}
      <Skeleton className="h-4 w-32 mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
