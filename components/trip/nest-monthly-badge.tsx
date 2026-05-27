import { getThisMonthSpent } from "@/lib/db/queries/expenses";
import { formatCurrency } from "@/lib/utils";

interface Props {
  groupId: string;
  defaultCurrency: string;
}

export function NestMonthlyBadgeSkeleton() {
  return (
    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
  );
}

export async function NestMonthlyBadge({ groupId, defaultCurrency }: Props) {
  const total = await getThisMonthSpent(groupId);

  return (
    <p className={`text-xs ${total > 0 ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"}`}>
      {total > 0
        ? `${formatCurrency(total, defaultCurrency)} this month`
        : "Nothing logged this month"}
    </p>
  );
}
