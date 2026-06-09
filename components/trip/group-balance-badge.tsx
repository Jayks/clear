import { getBalances } from "@/lib/db/queries/balances";
import { SplitAmount } from "@/components/shared/split-amount";

interface Props {
  groupId: string;
  memberId: string;
  currency: string;
}

export async function GroupBalanceBadge({ groupId, memberId, currency }: Props) {
  const { balances, hasMixedCurrencies } = await getBalances(groupId, currency);

  if (hasMixedCurrencies) {
    return (
      <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
        <span className="text-xs text-slate-400 dark:text-slate-500">Multi-currency group</span>
      </div>
    );
  }

  const hasExpenses = balances.some((b) => b.totalPaid > 0 || b.totalOwed > 0);
  const myBalance = balances.find((b) => b.memberId === memberId);
  const net = myBalance?.net ?? 0;

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
