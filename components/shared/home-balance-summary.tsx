import { getHomeBalances } from "@/lib/db/queries/balances";
import { computeHomeBalanceSummary, type HomeGroupMeta } from "@/lib/home/balance-summary";
import { HomeBalanceStrip } from "./home-balance-strip";

/**
 * HomeBalanceSummary — RSC streamed under the Home greeting via <Suspense>.
 * Reuses `getHomeBalances` (already cached + deduped for the card badges), so it
 * adds no extra query; the page shell paints instantly and this fills in.
 * Renders nothing for brand-new users (no financial activity yet).
 */
export async function HomeBalanceSummary({
  userId,
  groups,
}: {
  userId: string;
  groups: HomeGroupMeta[];
}) {
  const entries = await getHomeBalances(userId);
  const summary = computeHomeBalanceSummary(entries, groups);
  if (summary.state === "new") return null;
  return <HomeBalanceStrip summary={summary} />;
}

export function HomeBalanceSkeleton() {
  return (
    <div className="mb-6 flex items-center gap-2">
      <div className="h-7 w-28 rounded-full bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
      <div className="h-7 w-24 rounded-full bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
    </div>
  );
}
