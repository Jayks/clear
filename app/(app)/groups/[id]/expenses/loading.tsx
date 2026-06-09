import { Skeleton } from "@/components/shared/skeleton";

/**
 * Loading skeleton for /groups/[id]/expenses.
 * Mirrors the actual Trip/Nest Expenses page structure:
 *   1. Page header (back · icon · title · add button)
 *   2. Filter bar (category quick-pills + view-mode toggle icons)
 *   3. Expense list — one date-group header + 6 expense rows
 *      (single flowing block avoids the "two separate loading events" perception)
 *
 * Note: No summary strip — that only exists on the Circle wallet-expenses branch,
 *       which has its own loading path. TemplateSection (nest-only) is omitted
 *       because group type isn't known at loading time; it appears after RSC resolves.
 */
export default function ExpensesLoading() {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-16 hidden md:block" />
        <div className="hidden md:flex items-center gap-2.5 flex-1">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl hidden md:block" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Filter bar — category quick-pills + sort/view-mode toggle */}
      <div className="flex items-center gap-2 mb-5 overflow-hidden">
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
          {["w-16", "w-20", "w-14", "w-20"].map((w, i) => (
            <Skeleton key={i} className={`h-7 ${w} rounded-full shrink-0`} />
          ))}
        </div>
        {/* View-mode toggle (List / Timeline / Map) */}
        <div className="flex items-center gap-1 shrink-0">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>

      {/* Single date-group header + 6 expense rows — one continuous block */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Skeleton className="h-3 w-16" />
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/40" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="space-y-2">
          {[
            "w-44", "w-36", "w-40", "w-32", "w-48", "w-36",
          ].map((w, i) => (
            <div key={i} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className={`h-3.5 ${w}`} />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
