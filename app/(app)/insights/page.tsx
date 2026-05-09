import { getAllTripsInsightsData, getAllNestsInsightsData } from "@/lib/db/queries/insights";
import { InsightsTabs } from "@/components/insights/insights-tabs";
import { BarChart2, LayoutGrid } from "lucide-react";
import Link from "next/link";

export default async function AllInsightsPage() {
  const [tripsData, nestsData] = await Promise.all([
    getAllTripsInsightsData(),
    getAllNestsInsightsData(),
  ]);

  const hasAnyData = (tripsData && tripsData.tripCount > 0) || (nestsData && nestsData.nestCount > 0);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-4" />
        <h2 className="text-lg text-slate-700 dark:text-slate-200 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
          No insights yet
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          Create a trip or a nest and add expenses to see your analytics here.
        </p>
        <Link href="/groups"
          className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 shadow-md shadow-cyan-500/25 transition-all">
          <LayoutGrid className="w-4 h-4" /> Go to groups
        </Link>
      </div>
    );
  }

  const primaryCurrency =
    tripsData?.byTrip[0]?.currency ??
    nestsData?.byNest[0]?.currency ??
    "INR";

  return (
    <InsightsTabs
      tripsData={tripsData}
      nestsData={nestsData}
      primaryCurrency={primaryCurrency}
    />
  );
}
