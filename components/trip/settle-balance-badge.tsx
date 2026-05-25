import { getBalances } from "@/lib/db/queries/balances";
import { formatCurrency } from "@/lib/utils";

interface Props {
  groupId: string;
  currentMemberId: string;
  defaultCurrency: string;
}

export function SettleBalanceSkeleton() {
  return (
    <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
  );
}

export async function SettleBalanceBadge({ groupId, currentMemberId, defaultCurrency }: Props) {
  const { balances } = await getBalances(groupId, defaultCurrency);
  const myBalance = balances.find((b) => b.memberId === currentMemberId);

  if (!myBalance) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">Who owes whom</p>;
  }

  const { net } = myBalance;
  const hasActivity = balances.some((b) => b.totalPaid > 0 || b.totalOwed > 0);

  if (net < -0.005) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-400">
        You owe {formatCurrency(Math.abs(net), defaultCurrency)}
      </p>
    );
  }

  if (net > 0.005) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400">
        Owed {formatCurrency(net, defaultCurrency)}
      </p>
    );
  }

  if (hasActivity) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">All settled ✓</p>;
  }

  return <p className="text-xs text-slate-500 dark:text-slate-400">Who owes whom</p>;
}
