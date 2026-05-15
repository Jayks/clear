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
  return <CrossTripCard insights={crossTripInsights} />;
}
