import type { Group } from "@/lib/db/schema/groups";
import { getCircleCardData } from "@/lib/db/queries/circle";
import { CircleCard } from "./circle-card";
import { ArrowUpRight } from "lucide-react";

interface Props {
  group: Group;
}

/** RSC — fetches contribution data and renders the interactive CircleCard. */
export async function CircleCardServer({ group }: Props) {
  try {
    const cardData = await getCircleCardData(group.id, group.circleMode);
    return <CircleCard group={group} cardData={cardData} />;
  } catch {
    // Graceful fallback if query fails — never break the home page
    return (
      <div className="glass rounded-2xl p-4 flex items-center justify-between h-full">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{group.name}</p>
        <a href={`/groups/${group.id}`} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 ml-2">
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>
    );
  }
}

/** Suspense skeleton shown while CircleCardServer loads. */
export function CircleCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="h-1 w-full bg-violet-200 dark:bg-violet-900/40 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-14 rounded bg-violet-100 dark:bg-violet-900/30 animate-pulse" />
          <div className="h-3 w-8 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-3 w-8 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="h-6 w-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
