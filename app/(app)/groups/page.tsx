import { Plus, Archive, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { getAllGroups } from "@/lib/db/queries/groups";
import { TripCard } from "@/components/trip/trip-card";
import { AnimatedList } from "@/components/shared/animated-list";
import { ensureDemoGroup } from "@/app/actions/demo";
import { GroupsBackGuard } from "@/components/shared/groups-back-guard";

export default async function GroupsPage() {
  // ensureDemoGroup is best-effort — a Supabase timeout or transient error
  // must never break the groups page. Swallow failures silently.
  const [, { active: groups, archived }] = await Promise.all([
    ensureDemoGroup().catch(() => {}),
    getAllGroups().catch(() => ({ active: [], archived: [] })),
  ]);

  return (
    <div>
      <GroupsBackGuard />
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl text-slate-800 dark:text-slate-100 flex-1" style={{ fontFamily: "var(--font-fraunces)" }}>
          Your groups
        </h1>
        <Link
          href="/groups/new"
          data-tour="new-trip-btn"
          className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl px-4 py-2 shadow-md shadow-cyan-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          New group
        </Link>
      </div>

      {groups.length === 0 && archived.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/25">
            <LayoutGrid className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-xl text-slate-800 dark:text-slate-100 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
            No groups yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
            Create a trip or a nest — split expenses and settle up with ease.
          </p>
          <Link
            href="/groups/new"
            className="mt-6 inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium rounded-xl px-6 py-2.5 shadow-md shadow-cyan-500/25 transition-all"
          >
            Create your first group
          </Link>
        </div>
      ) : (
        <>
          {groups.length > 0 && (
            <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groups.map(({ group, memberCount }) => (
                <TripCard key={group.id} group={group} memberCount={Number(memberCount)} />
              ))}
            </AnimatedList>
          )}

          {archived.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Archive className="w-4 h-4" /> Archived
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-60">
                {archived.map(({ group, memberCount }) => (
                  <TripCard key={group.id} group={group} memberCount={Number(memberCount)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
