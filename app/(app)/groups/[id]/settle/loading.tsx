import { Skeleton } from "@/components/shared/skeleton";

/**
 * Loading skeleton for /groups/[id]/settle.
 * Mirrors the actual Settle Up page structure (via BalancesSection):
 *   1. Desktop header (back · icon · "Settle up" title)
 *   2. SettleHeroCard — personal position hero
 *   3. DebtFlowGraph area — SVG visualisation card
 *   4. Net balances section header + member balance cards
 *   5. "Minimum payments" section header + payment action cards
 */
export default function SettleLoading() {
  return (
    <div>
      {/* Desktop page header */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="w-9 h-9 rounded-xl" />
        <Skeleton className="h-7 w-24" />
      </div>

      {/* SettleHeroCard — personal position (the most prominent element) */}
      <div className="glass rounded-2xl p-5 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        {/* Large net amount */}
        <Skeleton className="h-10 w-36 rounded-lg" />
        {/* "You put in X · fair share Y" sub-line */}
        <Skeleton className="h-3 w-52" />
        {/* Person payment pills row */}
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>

      {/* DebtFlowGraph area */}
      <div className="glass rounded-2xl mb-6">
        <Skeleton className="h-56 rounded-2xl" />
      </div>

      {/* Net balances section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <Skeleton className="h-3.5 w-28" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>

      {/* Member balance cards */}
      <div className="glass rounded-2xl px-4 py-3 mb-8 space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton className="h-3.5 flex-1 max-w-[120px]" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>

      {/* Minimum payments section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <Skeleton className="h-3.5 w-40" />
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>

      {/* Payment action cards */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass rounded-xl px-4 py-4 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
