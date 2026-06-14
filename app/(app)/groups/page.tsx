import { Plus, MapPin, Home, Coins } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getAllGroups } from "@/lib/db/queries/groups";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserMemberIds } from "@/lib/db/queries/auth";
import { TripCard } from "@/components/trip/trip-card";
import { GroupBalanceBadge } from "@/components/trip/group-balance-badge";
import { AnimatedList } from "@/components/shared/animated-list";
import { EmptyChooser } from "@/components/shared/empty-chooser";
import { SampleBanner } from "@/components/shared/sample-banner";
import { SampleTourPrompt } from "@/components/shared/sample-tour-prompt";
import { GroupsBackGuard } from "@/components/shared/groups-back-guard";
import { LongPressHint } from "@/components/shared/long-press-hint";
import { PlanNudgeBanner } from "@/components/shared/plan-nudge-banner";
import { getGroupNudge, getGroupsAdminPlans } from "@/lib/subscription/gates";
import { canUseLoggingAI } from "@/lib/subscription/ai-quota";
import { SectionPillNav } from "@/components/shared/section-pill-nav";
import type { NavSection } from "@/components/shared/section-pill-nav";
import { EmptyTypeNudge } from "@/components/shared/empty-type-nudge";
import { StreamBadgeSync } from "@/components/stream/stream-badge-sync";
import { getStreamBadgeData } from "@/lib/db/queries/stream";
import { GlobalFab } from "@/components/shared/global-fab";
import { HomeGreeting } from "@/components/shared/home-greeting";
import { CircleCardServer, CircleCardSkeleton } from "@/components/circle/circle-card-server";
import { HomeControlBar } from "@/components/shared/home-control-bar";
import { BadgePop } from "@/components/shared/badge-pop";
import { HomeBalanceSummary, HomeBalanceSkeleton } from "@/components/shared/home-balance-summary";
import type { HomeGroupMeta } from "@/lib/home/balance-summary";

export default async function GroupsPage() {
  // Demo/sample data is no longer force-seeded on load — new users land on the
  // empty-state chooser and opt into a sample via SampleLoader.
  // Do NOT swallow a getAllGroups() failure into an empty result — that would
  // render the "No groups yet" empty state during a DB outage and make the user
  // think their groups vanished. Let it throw to the error boundary instead.
  const [{ active: groups, archived }, user] = await Promise.all([
    getAllGroups(),
    getCurrentUser(),
  ]);
  // Logging-AI (scan/NL quick-add) is free — gates the FAB scan/AI UI, not Plus.
  const isPlusUser = user ? await canUseLoggingAI(user.id) : false;

  // ── Split active groups: real vs sample (demo) ────────────────────────────
  // Real groups fill the Active tab; demos live in their own Sample tab.
  const realGroups = groups.filter((g) => !g.group.isDemo);
  // Sample cards ordered Trip → Nest → Circle (the tour highlights the trip first,
  // and it reads better than newest-first seeding order).
  const DEMO_ORDER: Record<string, number> = { trip: 0, nest: 1, circle: 2 };
  const demoGroups = groups
    .filter((g) => g.group.isDemo)
    .sort((a, b) => (DEMO_ORDER[a.group.groupType] ?? 9) - (DEMO_ORDER[b.group.groupType] ?? 9));
  // The sample trip the tour walks through (passed to start() so it never has to
  // scrape the DOM for the id).
  const demoTripId = demoGroups.find((g) => g.group.groupType === "trip")?.group.id ?? null;

  const trips   = realGroups.filter((g) => g.group.groupType === "trip");
  const nests   = realGroups.filter((g) => g.group.groupType === "nest");
  const circles = realGroups.filter((g) => g.group.groupType === "circle");

  // Eligible groups for the Home net-position strip (the pure summary fn filters
  // out circles + demo; we pass them all so the logic stays in one tested place).
  const balanceGroups: HomeGroupMeta[] = [...trips, ...nests, ...circles].map(({ group }) => ({
    id: group.id,
    name: group.name,
    groupType: group.groupType,
    isDemo: group.isDemo ?? false,
  }));

  // ── Split archived groups by type ─────────────────────────────────────────
  const archivedTrips   = archived.filter((g) => g.group.groupType === "trip");
  const archivedNests   = archived.filter((g) => g.group.groupType === "nest");
  const archivedCircles = archived.filter((g) => g.group.groupType === "circle");

  const allIds    = [...groups, ...archived].map((g) => g.group.id);
  const activeIds = groups.map((g) => g.group.id);
  const [memberIds, groupNudge, adminPlans, streamBadge] = await Promise.all([
    user && allIds.length > 0
      ? getUserMemberIds(allIds, user.id)
      : Promise.resolve<Record<string, { id: string; role: string }>>({}),
    user ? getGroupNudge(user.id) : Promise.resolve(null),
    activeIds.length > 0
      ? getGroupsAdminPlans(activeIds)
      : Promise.resolve<Record<string, "plus" | "free">>({}),
    user ? getStreamBadgeData(user.id) : Promise.resolve({ latestUpdatedAt: null, hasDisputed: false }),
  ]);

  const isEmpty   = groups.length === 0 && archived.length === 0;
  const firstName = (user?.user_metadata?.full_name as string | undefined)
    ?.split(" ")[0] ?? null;

  // Balance badge loading skeleton — matches the exact px-4 py-2 border-t shape
  // of GroupBalanceBadge so there's no layout shift when the balance loads.
  function balanceFallback() {
    return (
      <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
        <div className="h-3 w-20 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
      </div>
    );
  }

  // ── Active SectionPillNav ─────────────────────────────────────────────────
  // Archived has its own dedicated view — no amber "Archived" pill needed here
  const activeSections: NavSection[] = [
    ...(trips.length   > 0 ? [{ id: "trips",   label: "Trips",   count: trips.length,   color: "cyan"    as const }] : []),
    ...(nests.length   > 0 ? [{ id: "nests",   label: "Nests",   count: nests.length,   color: "emerald" as const }] : []),
    ...(circles.length > 0 ? [{ id: "circles", label: "Circles", count: circles.length, color: "violet"  as const }] : []),
  ];
  // Missing group types are now surfaced by the in-section EmptyTypeNudge cards
  // (one per type), so the old dashed "create" pills here would be a redundant
  // second CTA for the same action — dropped.

  // ── Archived SectionPillNav ───────────────────────────────────────────────
  // Same color system, only types that actually have archived groups
  const archivedSections: NavSection[] = [
    ...(archivedTrips.length   > 0 ? [{ id: "archived-trips",   label: "Trips",   count: archivedTrips.length,   color: "cyan"    as const }] : []),
    ...(archivedNests.length   > 0 ? [{ id: "archived-nests",   label: "Nests",   count: archivedNests.length,   color: "emerald" as const }] : []),
    ...(archivedCircles.length > 0 ? [{ id: "archived-circles", label: "Circles", count: archivedCircles.length, color: "violet"  as const }] : []),
  ];

  // ── Active content — real groups, or the chooser when there are none ──────
  const activeContent = realGroups.length === 0 ? (
    <EmptyChooser showSampleCta={demoGroups.length === 0} />
  ) : (
    <>
      {activeSections.length > 1 && (
        <SectionPillNav sections={activeSections} createPills={[]} />
      )}

      {/* ── Trips ─────────────────────────────────────────────────────────── */}
      {/* Shown whenever the user has any real group — empty types get a nudge card */}
      {realGroups.length > 0 && (
        <section id="trips" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <BadgePop className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30
                            flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </BadgePop>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Trips</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
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

          {trips.length === 0 ? (
            <EmptyTypeNudge type="trip" />
          ) : (
            <>
              <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trips.map(({ group, memberCount }, index) => {
                  const memberInfo = memberIds[group.id];
                  return (
                    <div key={group.id} data-group-card="" data-group-name={group.name.toLowerCase()}>
                      <TripCard
                        group={group}
                        memberCount={Number(memberCount)}
                        priority={index < 2}
                        isPlusPlan={adminPlans[group.id] === "plus"}
                        isAdmin={memberInfo?.role === "admin"}
                        balanceBadge={
                          memberInfo && user && !group.isDemo ? (
                            <Suspense key={group.id} fallback={balanceFallback()}>
                              <GroupBalanceBadge groupId={group.id} userId={user.id} />
                            </Suspense>
                          ) : undefined
                        }
                      />
                    </div>
                  );
                })}
              </AnimatedList>
              <LongPressHint demoTripId={trips.find((g) => g.group.isDemo)?.group.id ?? null} />
            </>
          )}
        </section>
      )}

      {/* ── Nests ─────────────────────────────────────────────────────────── */}
      {/* Shown whenever the user has any real group — empty types get a nudge card */}
      {realGroups.length > 0 && (
        <section id="nests" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <BadgePop className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/30
                            flex items-center justify-center shrink-0">
              <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </BadgePop>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nests</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
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

          {nests.length === 0 ? (
            <EmptyTypeNudge type="nest" />
          ) : (
            <AnimatedList
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initialDelayMs={trips.length > 0 ? trips.length * 80 : 0}
            >
              {nests.map(({ group, memberCount }, index) => {
                const memberInfo = memberIds[group.id];
                return (
                  <div key={group.id} data-group-card="" data-group-name={group.name.toLowerCase()}>
                    <TripCard
                      group={group}
                      memberCount={Number(memberCount)}
                      priority={index < 2 && trips.length === 0}
                      isPlusPlan={adminPlans[group.id] === "plus"}
                      isAdmin={memberInfo?.role === "admin"}
                      balanceBadge={
                        memberInfo && user && !group.isDemo ? (
                          <Suspense key={group.id} fallback={balanceFallback()}>
                            <GroupBalanceBadge groupId={group.id} userId={user.id} />
                          </Suspense>
                        ) : undefined
                      }
                    />
                  </div>
                );
              })}
            </AnimatedList>
          )}
        </section>
      )}

      {/* ── Circles ───────────────────────────────────────────────────────── */}
      {/* Shown whenever the user has any real group — empty types get a nudge card */}
      {realGroups.length > 0 && (
        <section id="circles" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <BadgePop className="w-6 h-6 rounded-md bg-violet-50 dark:bg-violet-900/30
                            flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </BadgePop>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Circles</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
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

          {circles.length === 0 ? (
            <EmptyTypeNudge type="circle" />
          ) : (
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
          )}
        </section>
      )}
    </>
  );

  // ── Archived content ──────────────────────────────────────────────────────
  const archivedContent = (
    <>
      {archivedSections.length > 1 && (
        <SectionPillNav sections={archivedSections} createPills={[]} />
      )}

      {/* ── Archived Trips ────────────────────────────────────────────────── */}
      {archivedTrips.length > 0 && (
        <section id="archived-trips" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <BadgePop className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30
                            flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </BadgePop>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Trips</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
                            from-cyan-200/70 to-transparent
                            dark:from-cyan-800/40 dark:to-transparent" />
          </div>
          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {archivedTrips.map(({ group, memberCount }) => (
              <div key={group.id}>
                <TripCard
                  group={group}
                  memberCount={Number(memberCount)}
                  isAdmin={memberIds[group.id]?.role === "admin"}
                />
              </div>
            ))}
          </AnimatedList>
        </section>
      )}

      {/* ── Archived Nests ────────────────────────────────────────────────── */}
      {archivedNests.length > 0 && (
        <section id="archived-nests" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <BadgePop className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/30
                            flex items-center justify-center shrink-0">
              <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </BadgePop>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nests</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
                            from-emerald-200/70 to-transparent
                            dark:from-emerald-800/40 dark:to-transparent" />
          </div>
          <AnimatedList
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initialDelayMs={archivedTrips.length > 0 ? archivedTrips.length * 80 : 0}
          >
            {archivedNests.map(({ group, memberCount }) => (
              <div key={group.id}>
                <TripCard
                  group={group}
                  memberCount={Number(memberCount)}
                  isAdmin={memberIds[group.id]?.role === "admin"}
                />
              </div>
            ))}
          </AnimatedList>
        </section>
      )}

      {/* ── Archived Circles ──────────────────────────────────────────────── */}
      {archivedCircles.length > 0 && (
        <section id="archived-circles" data-group-section="" className="scroll-mt-28 mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <BadgePop className="w-6 h-6 rounded-md bg-violet-50 dark:bg-violet-900/30
                            flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </BadgePop>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Circles</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
                            from-violet-200/70 to-transparent
                            dark:from-violet-800/40 dark:to-transparent" />
          </div>
          <AnimatedList
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initialDelayMs={(archivedTrips.length + archivedNests.length) > 0
              ? (archivedTrips.length + archivedNests.length) * 80
              : 0}
          >
            {archivedCircles.map(({ group, memberCount }) => (
              <div key={group.id}>
                {/* Archived circles use TripCard — interactive CircleCardServer
                    only makes sense for active groups */}
                <TripCard
                  group={group}
                  memberCount={Number(memberCount)}
                  isAdmin={memberIds[group.id]?.role === "admin"}
                />
              </div>
            ))}
          </AnimatedList>
        </section>
      )}
    </>
  );

  // ── Sample content — the demo trip/nest/circle, isolated from real groups ──
  const sampleContent = (
    <>
      <SampleBanner demoTripId={demoTripId} />
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {demoGroups.map(({ group, memberCount }) => (
          <div key={group.id} data-group-card="" data-group-name={group.name.toLowerCase()}>
            {group.groupType === "circle" ? (
              <Suspense fallback={<CircleCardSkeleton />}>
                <CircleCardServer group={group} />
              </Suspense>
            ) : (
              <TripCard
                group={group}
                memberCount={Number(memberCount)}
                isAdmin={memberIds[group.id]?.role === "admin"}
              />
            )}
          </div>
        ))}
      </AnimatedList>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <GroupsBackGuard />

      {/* ── Personal greeting ──────────────────────────────────────────────── */}
      {user && <HomeGreeting firstName={firstName} />}

      {/* ── Net-position strip — streamed; reuses the cached badge query ─────── */}
      {user && !isEmpty && (
        <Suspense fallback={<HomeBalanceSkeleton />}>
          <HomeBalanceSummary userId={user.id} groups={balanceGroups} />
        </Suspense>
      )}

      {/* Invisible — syncs Streams nav badge via localStorage */}
      <StreamBadgeSync
        latestUpdatedAt={streamBadge.latestUpdatedAt}
        hasDisputed={streamBadge.hasDisputed}
      />
      {groupNudge && <PlanNudgeBanner nudge={groupNudge} resource="groups" />}

      {/* ── Empty state — "what are you tracking?" chooser (truly nothing) ──── */}
      {isEmpty && <EmptyChooser showSampleCta />}

      {/* ── Active / Archived / Sample tabs ─────────────────────────────────── */}
      {!isEmpty && (
        <HomeControlBar
          activeCount={realGroups.length}
          archivedCount={archived.length}
          sampleCount={demoGroups.length}
          showSearch={realGroups.length > 5}
          activeContent={activeContent}
          archivedContent={archivedContent}
          sampleContent={sampleContent}
        />
      )}

      {/* ── Global FAB ─────────────────────────────────────────────────────── */}
      {!isEmpty && <GlobalFab trips={trips} nests={nests} circles={circles} isPlusUser={isPlusUser} />}

      {/* Post-seed "want a tour?" prompt (self-gates on the just-seeded flag) */}
      {demoGroups.length > 0 && <SampleTourPrompt demoTripId={demoTripId} />}
    </div>
  );
}
