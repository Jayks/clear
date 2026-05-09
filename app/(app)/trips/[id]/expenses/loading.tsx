import { Skeleton } from "@/components/shared/skeleton";

export default function ExpensesLoading() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-28" />
        <div className="ml-auto">
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-12 rounded-xl mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
