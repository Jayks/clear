import { getTopCategory } from "@/lib/db/queries/expenses";
import { getCategory } from "@/lib/categories";

interface Props {
  groupId: string;
}

export function InsightsSummaryBadgeSkeleton() {
  return (
    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
  );
}

export async function InsightsSummaryBadge({ groupId }: Props) {
  const topCategory = await getTopCategory(groupId);

  if (!topCategory) {
    return <p className="text-xs text-amber-500/70 dark:text-amber-400/60">No data yet</p>;
  }

  const cat = getCategory(topCategory);

  return (
    <p className="text-xs text-amber-600 dark:text-amber-400">
      Top: {cat.label}
    </p>
  );
}
