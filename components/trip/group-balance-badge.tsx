import { getHomeBalances } from "@/lib/db/queries/balances";
import { SplitAmount } from "@/components/shared/split-amount";

interface Props {
  groupId: string;
  userId: string;
}

export async function GroupBalanceBadge({ groupId, userId }: Props) {
  // Shared across every badge on the home page — getHomeBalances is React
  // cache()-wrapped, so the underlying batched query runs once per render.
  const all = await getHomeBalances(userId);
  const entry = all[groupId];

  if (!entry || entry.hasMixedCurrencies) {
    return (
      <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {entry?.hasMixedCurrencies ? "Multi-currency group" : "No expenses yet"}
        </span>
      </div>
    );
  }

  const { net, hasExpenses, currency } = entry;

  if (net === 0) {
    return (
      <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
        {hasExpenses ? (
          <span className="text-xs font-medium text-emerald-600/70 dark:text-emerald-500/60">All settled ✓</span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">No expenses yet</span>
        )}
      </div>
    );
  }

  const isOwed = net > 0;

  return (
    <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
      <span className={`text-xs font-semibold ${isOwed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
        {isOwed ? "You're owed " : "You owe "}
        <SplitAmount amount={Math.abs(net)} currency={currency} />
      </span>
    </div>
  );
}
