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

/** Suspense skeleton shown while CircleCardServer loads.
 *  Mirrors the actual CircleCard structure:
 *  - 3px colour stripe at top
 *  - h-44 gradient header (mode badge + hub button + name + wallet subtitle)
 *  - 3px fill progress bar strip
 *  - Bottom action strip (paid count + chip)
 */
export function CircleCardSkeleton() {
  return (
    <div className="shadow-md shadow-violet-500/15 rounded-2xl">
      <div className="glass rounded-2xl overflow-hidden relative h-full flex flex-col animate-pulse">
        {/* Colour stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px] z-20 rounded-t-2xl bg-gradient-to-r from-violet-400/80 via-violet-300/50 to-transparent" />

        {/* h-44 gradient header */}
        <div className="h-44 relative bg-gradient-to-br from-slate-100 to-indigo-100 dark:from-slate-800 dark:to-indigo-900 flex-none">
          {/* Mode badge top-left */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <div className="h-4.5 w-16 rounded-full bg-indigo-200/70 dark:bg-indigo-700/40" />
            <div className="h-4 w-10 rounded-full bg-black/10 dark:bg-black/30" />
          </div>
          {/* Hub button top-right */}
          <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/10 dark:bg-black/30" />
          {/* Name + wallet at bottom */}
          <div className="absolute bottom-3 left-4 right-4 space-y-1.5">
            <div className="h-5 w-32 rounded-md bg-slate-300/60 dark:bg-slate-600/60" />
            <div className="h-3 w-24 rounded bg-slate-300/40 dark:bg-slate-600/40" />
          </div>
        </div>

        {/* Progress bar strip */}
        <div className="h-[3px] w-1/2 bg-indigo-300 dark:bg-indigo-600" />

        {/* Bottom action strip */}
        <div className="flex-1 px-4 py-3 flex items-center justify-between gap-3">
          <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-6 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
        </div>
      </div>
    </div>
  );
}
