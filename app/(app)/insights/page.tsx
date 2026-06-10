import { getAllTripsInsightsData, getAllNestsInsightsData, getPersonalInsightsData } from "@/lib/db/queries/insights";
import { InsightsTabs } from "@/components/insights/insights-tabs";
import { BarChart2, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserPlan } from "@/lib/subscription/gates";
import { getStreamSummary } from "@/lib/db/queries/stream";

export default async function AllInsightsPage() {
  const [tripsData, nestsData, personalData, user] = await Promise.all([
    getAllTripsInsightsData(),
    getAllNestsInsightsData(),
    getPersonalInsightsData(),
    getCurrentUser(),
  ]);

  // streamData and the user's plan both depend only on `user` and are independent
  // of each other — fetch them together instead of in two sequential round-trips.
  const [streamData, userPlan] = await Promise.all([
    user ? getStreamSummary(user.id) : Promise.resolve(null),
    user ? getUserPlan(user.id) : Promise.resolve<"plus" | "free">("free"),
  ]);
  // S-4 fix: derive currency from the top stream record instead of hardcoding
  // "INR".  Hardcoding caused non-INR streams (USD, EUR, etc.) to show the
  // wrong currency symbol next to their totals on the Insights page.
  const streamSummary = streamData && (streamData.totalOwedToMe > 0 || streamData.totalIOwe > 0)
    ? {
        owedToMe: streamData.totalOwedToMe,
        iOwe:     streamData.totalIOwe,
        currency: streamData.topRecords[0]?.currency ?? "INR",
      }
    : undefined;

  const isPlusUser = userPlan === "plus";

  const hasAnyData = (tripsData && tripsData.tripCount > 0) || (nestsData && nestsData.nestCount > 0);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/25">
          <BarChart2 className="w-7 h-7 text-white" />
        </div>
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
      personalData={personalData}
      isPlusUser={isPlusUser}
      streamSummary={streamSummary}
    />
  );
}
