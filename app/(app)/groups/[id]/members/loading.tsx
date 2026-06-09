import { Skeleton } from "@/components/shared/skeleton";

/**
 * Loading skeleton for /groups/[id]/members.
 * Mirrors the actual Members page structure:
 *   1. Desktop-only back link
 *   2. Mobile spacer (visible on mobile instead of back link)
 *   3. Desktop-only icon + title heading
 *   4. Section header (violet, member count)
 *   5. Member list rows (avatar + name + role badge)
 *   6. Invite section card
 */
export default function MembersLoading() {
  return (
    <div>
      {/* Desktop-only back link */}
      <div className="hidden md:block mb-6">
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Mobile spacer — matches actual page's mb-4 md:hidden spacer */}
      <div className="mb-4 md:hidden" />

      {/* Desktop-only page title */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
        <Skeleton className="h-7 w-28" />
      </div>

      {/* Section header — violet, member count */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-900/30 shrink-0" />
        <Skeleton className="h-3.5 w-24" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>

      {/* Member list */}
      <div className="glass rounded-2xl divide-y divide-white/40 dark:divide-slate-700/40 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            {/* Role badge */}
            <Skeleton className="h-5 w-12 rounded-full shrink-0" />
          </div>
        ))}
      </div>

      {/* Invite / share section card */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-6 h-6 rounded-md shrink-0" />
          <Skeleton className="h-3.5 w-28" />
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
        </div>
        <Skeleton className="h-3 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
}
