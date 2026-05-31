import { Plus, Archive, MapPin, Home, Coins } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getAllGroups } from "@/lib/db/queries/groups";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserMemberIds } from "@/lib/db/queries/auth";
import { TripCard } from "@/components/trip/trip-card";
import { GroupBalanceBadge } from "@/components/trip/group-balance-badge";
import { AnimatedList } from "@/components/shared/animated-list";
import { ensureDemoGroup } from "@/app/actions/demo";
import { GroupsBackGuard } from "@/components/shared/groups-back-guard";
import { LongPressHint } from "@/components/shared/long-press-hint";
import { PlanNudgeBanner } from "@/components/shared/plan-nudge-banner";
import { getGroupNudge, getGroupsAdminPlans } from "@/lib/subscription/gates";
import { SectionPillNav } from "@/components/shared/section-pill-nav";
import type { NavSection, CreatePill } from "@/components/shared/section-pill-nav";
import { GroupSearchInput } from "@/components/shared/group-search-input";
import { StreamBadgeSync } from "@/components/stream/stream-badge-sync";
import { getStreamBadgeData } from "@/lib/db/queries/stream";
import { GlobalFab } from "@/components/shared/global-fab";
import { HomeGreeting } from "@/components/shared/home-greeting";
import { CircleCardServer, CircleCardSkeleton } from "@/components/circle/circle-card-server";

export default async function GroupsPage() {
  await ensureDemoGroup().catch(() => {});
  const [{ active: groups, archived }, user] = await Promise.all([
    getAllGroups().catch(() => ({ active: [], archived: [] })),
    getCurrentUser(),
  ]);

  // Split active groups by type
  const trips   = groups.filter((g) => g.group.groupType === "trip");
  const nests   = groups.filter((g) => g.group.groupType === "nest");
  const circles = groups.filter((g) => g.group.groupType === "circle");

  const allIds    = [...groups, ...archived].map((g) => g.group.id);
  const activeIds = groups.map((g) => g.group.id);
  const [memberIds, groupNudge, adminPlans, streamBadge] = await Promise.all([
    user && allIds.length > 0
      ? getUserMemberIds(allIds, user.id)
      : Promise.resolve<Record<string, string>>({}),
    user ? getGroupNudge(user.id) : Promise.resolve(null),
    activeIds.length > 0
      ? getGroupsAdminPlans(activeIds)
      : Promise.resolve<Record<string, "plus" | "free">>({}),
    user ? getStreamBadgeData(user.id) : Promise.resolve({ latestUpdatedAt: null, hasDisputed: false }),
  ]);

  const isEmpty    = groups.length === 0 && archived.length === 0;
  const firstName  = (user?.user_metadata?.full_name as string | undefined)
    ?.split(" ")[0] ?? null;

  // Balance badge fallback — used in both sections
  function balanceFallback() {
    return (
      <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
        <span className="text-xs text-slate-300 dark:text-slate-600">···</span>
      </div>
    );
  }

  return (
    <div>
      <GroupsBackGuard />

      {/* ── Personal greeting ──────────────────────────────────────────────── */}
      {user && <HomeGreeting firstName={firstName} />}

      {/* Invisible — syncs Streams nav badge via localStorage */}
      <StreamBadgeSync
        latestUpdatedAt={streamBadge.latestUpdatedAt}
        hasDisputed={streamBadge.hasDisputed}
      />
      {groupNudge && <PlanNudgeBanner nudge={groupNudge} resource="groups" />}

      {/* ── Group search (> 5 groups) ──────────────────────────────────────── */}
      <GroupSearchInput totalCount={groups.length} />

      {/* ── Sticky section pill nav ────────────────────────────────────────── */}
      {!isEmpty && (() => {
        const sections: NavSection[] = [
          ...(trips.length    > 0 ? [{ id: "trips",    label: "Trips",    count: trips.length,    color: "cyan"    as const }] : []),
          ...(nests.length    > 0 ? [{ id: "nests",    label: "Nests",    count: nests.length,    color: "emerald" as const }] : []),
          ...(circles.length  > 0 ? [{ id: "circles",  label: "Circles",  count: circles.length,  color: "violet"  as const }] : []),
          ...(archived.length > 0 ? [{ id: "archived", label: "Archived", count: archived.length, color: "amber"   as const }] : []),
        ];
        // Dashed create pills for missing section types
        const createPills: CreatePill[] = [
          ...(trips.length === 0 && groups.length > 0   ? [{ label: "New Trip",   href: "/groups/new?type=trip",   color: "cyan"    as const }] : []),
          ...(nests.length === 0 && groups.length > 0   ? [{ label: "New Nest",   href: "/groups/new?type=nest",   color: "emerald" as const }] : []),
          ...(circles.length === 0 && groups.length > 0 ? [{ label: "New Circle", href: "/groups/new?type=circle", color: "violet"  as const }] : []),
        ];
        return (sections.length > 1 || createPills.length > 0)
          ? <SectionPillNav sections={sections} createPills={createPills} />
          : null;
      })()}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500
                            flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500
                            flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Home className="w-7 h-7 text-white" />
            </div>
          </div>
          <h2
            className="text-xl text-slate-800 dark:text-slate-100 mb-2"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            No groups yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-6">
            Create a Trip for one-off travel and events, or a Nest for ongoing household expenses.
          </p>
          <div className="flex gap-3">
            <Link
              href="/groups/new?type=trip"
              className="inline-flex items-center gap-1.5
                         bg-gradient-to-br from-cyan-500 to-teal-500
                         hover:from-cyan-600 hover:to-teal-600
                         text-white text-sm font-medium rounded-xl px-4 py-2.5
                         shadow-md shadow-cyan-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </Link>
            <Link
              href="/groups/new?type=nest"
              className="inline-flex items-center gap-1.5
                         bg-gradient-to-br from-emerald-500 to-teal-500
                         hover:from-emerald-600 hover:to-teal-600
                         text-white text-sm font-medium rounded-xl px-4 py-2.5
                         shadow-md shadow-emerald-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Nest
            </Link>
          </div>
        </div>
      )}

      {/* ── Trips section ──────────────────────────────────────────────────── */}
      {trips.length > 0 && (
        <section id="trips" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30
                            flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Trips</span>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r
                            from-cyan-200/70 to-transparent
                            dark:from-cyan-800/40 dark:to-transparent" />
            <Link
              href="/groups/new?type=trip"
              data-tour="new-trip-btn"
              aria-label="New trip"
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                         bg-gradient-to-br from-cyan-500 to-teal-500
                         hover:from-cyan-600 hover:to-teal-600
                         text-white shadow-sm shadow-cyan-500/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trips.map(({ group, memberCount }, index) => {
              const memberId = memberIds[group.id];
              return (
                <div data-group-card="" data-group-name={group.name.toLowerCase()}>
                  <TripCard
                    key={group.id}
                    group={group}
                    memberCount={Number(memberCount)}
                    priority={index < 2}
                    isPlusPlan={adminPlans[group.id] === "plus"}
                    balanceBadge={
                      memberId ? (
                        <Suspense key={group.id} fallback={balanceFallback()}>
                          <GroupBalanceBadge
                            groupId={group.id}
                            memberId={memberId}
                            currency={group.defaultCurrency}
                          />
                        </Suspense>
                      ) : undefined
                    }
                  />
                </div>
              );
            })}
          </AnimatedList>

          <LongPressHint
            demoTripId={trips.find((g) => g.group.isDemo)?.group.id ?? null}
          />
        </section>
      )}

      {/* ── Nests section ──────────────────────────────────────────────────── */}
      {nests.length > 0 && (
        <section id="nests" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/30
                            flex items-center justify-center shrink-0">
              <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nests</span>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r
                            from-emerald-200/70 to-transparent
                            dark:from-emerald-800/40 dark:to-transparent" />
            <Link
              href="/groups/new?type=nest"
              aria-label="New nest"
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                         bg-gradient-to-br from-emerald-500 to-teal-500
                         hover:from-emerald-600 hover:to-teal-600
                         text-white shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          <AnimatedList
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initialDelayMs={trips.length > 0 ? trips.length * 80 : 0}
          >
            {nests.map(({ group, memberCount }, index) => {
              const memberId = memberIds[group.id];
              return (
                <div key={group.id} data-group-card="" data-group-name={group.name.toLowerCase()}>
                  <TripCard
                    group={group}
                    memberCount={Number(memberCount)}
                    priority={index < 2 && trips.length === 0}
                    isPlusPlan={adminPlans[group.id] === "plus"}
                    balanceBadge={
                      memberId ? (
                        <Suspense key={group.id} fallback={balanceFallback()}>
                          <GroupBalanceBadge
                            groupId={group.id}
                            memberId={memberId}
                            currency={group.defaultCurrency}
                          />
                        </Suspense>
                      ) : undefined
                    }
                  />
                </div>
              );
            })}
          </AnimatedList>
        </section>
      )}

      {/* ── Circles section ────────────────────────────────────────────────── */}
      {circles.length > 0 && (
        <section id="circles" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-md bg-violet-50 dark:bg-violet-900/30
                            flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Circles</span>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r
                            from-violet-200/70 to-transparent
                            dark:from-violet-800/40 dark:to-transparent" />
            <Link
              href="/groups/new?type=circle"
              aria-label="New circle"
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                         bg-gradient-to-br from-violet-500 to-purple-600
                         hover:from-violet-600 hover:to-purple-700
                         text-white shadow-sm shadow-violet-500/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          <AnimatedList
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initialDelayMs={(trips.length + nests.length) > 0 ? (trips.length + nests.length) * 80 : 0}
          >
            {circles.map(({ group }) => (
              <div key={group.id} data-group-card="" data-group-name={group.name.toLowerCase()}>
                <Suspense fallback={<CircleCardSkeleton />}>
                  <CircleCardServer group={group} />
                </Suspense>
              </div>
            ))}
          </AnimatedList>
        </section>
      )}

      {/* ── Archived section ───────────────────────────────────────────────── */}
      {archived.length > 0 && (
        <section id="archived" className="scroll-mt-28 mt-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800
                            flex items-center justify-center shrink-0">
              <Archive className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
              Archived
            </span>
            <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-60">
            {archived.map(({ group, memberCount }) => (
              <TripCard key={group.id} group={group} memberCount={Number(memberCount)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Global FAB — log expense (with group picker) or log stream entry ── */}
      {!isEmpty && <GlobalFab trips={trips} nests={nests} circles={circles} />}
    </div>
  );
}
