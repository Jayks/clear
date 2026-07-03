import { Skeleton } from "@/components/shared/skeleton";

export default function NotificationsLoading() {
  return (
    <div>
      <Skeleton className="h-5 w-16 mb-4" />
      <Skeleton className="h-8 w-44 mb-6" />
      <div className="glass rounded-2xl p-1.5 space-y-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-3.5">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
