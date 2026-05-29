import { TrendingUp } from "lucide-react";
import { getOtherTripsSummary } from "@/lib/db/queries/insights";
import { computeCrossTripInsights } from "@/lib/insights/cross-trip";
import { CrossTripCard } from "@/components/insights/cross-trip-card";

interface Props {
  groupId: string;
  totalSpend: number;
  memberCount: number;
  tripDays: number;
  currency: string;
  topCategory: string | null;
  topCategoryPct: number;
  perPersonDaily: number;
}

export async function CrossTripSection({
  groupId,
  totalSpend,
  memberCount,
  tripDays,
  currency,
  topCategory,
  topCategoryPct,
  perPersonDaily,
}: Props) {
  const otherTrips = await getOtherTripsSummary(groupId);
  const crossTripInsights = computeCrossTripInsights({
    current: { totalSpend, memberCount, tripDays, currency, topCategory, topCategoryPct, perPersonDaily },
    others: otherTrips,
  });

  if (crossTripInsights.length === 0) return null;

  return (
    <>
      {/* Section header lives here so it only renders when there are comparisons */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">How this trip compares</span>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/70 to-transparent dark:from-amber-800/40 dark:to-transparent" />
      </div>
      <CrossTripCard insights={crossTripInsights} />
    </>
  );
}
