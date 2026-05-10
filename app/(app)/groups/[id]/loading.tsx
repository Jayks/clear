import { Skeleton } from "@/components/shared/skeleton";

export default function GroupLoading() {
  return (
    <div>
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Hero */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <Skeleton className="h-52 rounded-none" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Invite card */}
      <div className="glass rounded-xl p-4 mb-2 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-3 w-28 mx-auto" />
      </div>
    </div>
  );
}
