import { TrendingUp } from "lucide-react";
import { getOtherTripsSummary } from "@/lib/db/queries/insights";
import { computeCrossTripInsights } from "@/lib/insights/cross-trip";
import { CrossTripCard } from "@/components/insights/cross-trip-card";
import { SectionHeader } from "@/components/shared/section-header";
import type { ContextTheme } from "@/lib/theme/context-theme";

interface Props {
  groupId: string;
  theme: ContextTheme;
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
  theme,
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
      <SectionHeader icon={TrendingUp} label="How this trip compares" theme={theme} className="mb-4" />
      <CrossTripCard insights={crossTripInsights} />
    </>
  );
}
