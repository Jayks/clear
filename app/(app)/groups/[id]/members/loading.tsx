import { Skeleton } from "@/components/shared/skeleton";

export default function MembersLoading() {
  return (
    <div className="max-w-xl mx-auto">
      <Skeleton className="h-4 w-24 mb-6" />
      <Skeleton className="h-7 w-28 mb-1" />
      <Skeleton className="h-4 w-40 mb-6" />

      <div className="glass rounded-2xl divide-y divide-white/40 dark:divide-slate-700/40 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-32 rounded-2xl mb-4" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
