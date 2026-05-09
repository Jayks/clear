import { Skeleton } from "@/components/shared/skeleton";

export default function TripsLoading() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl overflow-hidden">
            <Skeleton className="h-44 rounded-none" />
            <div className="px-4 py-3 flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
