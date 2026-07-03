import { Plus, MapPin, Building2, Coins } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { after } from "next/server";
import { getAllGroups } from "@/lib/db/queries/groups";
import { checkTripWrapUps } from "@/lib/notifications/trip-wrapup-check";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserMemberIds } from "@/lib/db/queries/auth";
import { TripCard } from "@/components/trip/trip-card";
import { GroupBalanceBadge } from "@/components/trip/group-balance-badge";
import { AnimatedList } from "@/components/shared/animated-list";
import { CollapsibleGroupGrid } from "@/components/shared/collapsible-group-grid";
import { EmptyChooser } from "@/components/shared/empty-chooser";
import { SampleBanner } from "@/components/shared/sample-banner";
import { SampleTourPrompt } from "@/components/shared/sample-tour-prompt";
import { GroupsBackGuard } from "@/components/shared/groups-back-guard";
import { LongPressHint } from "@/components/shared/long-press-hint";
import { PlanNudgeBanner } from "@/components/shared/plan-nudge-banner";
import { getGroupNudge, getGroupsAdminPlans } from "@/lib/subscription/gates";
import { getMyLockedGroupIds } from "@/lib/subscription/degradation-queries";
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
import { WhatsNewBanner } from "@/components/shared/whats-new-banner";

// Maps URL ?type= param → DB groupType value
const TYPE_FILTER_MAP = {
  trips:   "trip",
  nests:   "nest",
  circles: "circle",
} as const;
type TypeFilter = keyof typeof TYPE_FILTER_MAP;

function isValidTypeFilter(v: string | undefined): v is TypeFilter {
  return v === "trips" || v === "nests" || v === "circles";
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  // ?type= drives type-filtered sidebar navigation (desktop).
  // Mobile ignores this entirely — bottom nav + SectionPillNav are unchanged.
  const resolvedParams = await searchParams;
  const typeParam = resolvedParams?.type;
  const typeFilter: TypeFilter | null = isValidTypeFilter(typeParam) ? typeParam : null;

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
  const [memberIds, groupNudge, adminPlans, streamBadge, lockedGroupIds] = await Promise.all([
    user && allIds.length > 0
      ? getUserMemberIds(allIds, user.id)
      : Promise.resolve<Record<string, { id: string; role: string }>>({}),
    user ? getGroupNudge(user.id) : Promise.resolve(null),
    activeIds.length > 0
      ? getGroupsAdminPlans(activeIds)
      : Promise.resolve<Record<string, "plus" | "free">>({}),
    user ? getStreamBadgeData(user.id) : Promise.resolve({ latestUpdatedAt: null, hasDisputed: false }),
    user ? getMyLockedGroupIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const isEmpty   = groups.length === 0 && archived.length === 0;
  const firstName = (user?.user_metadata?.full_name as string | undefined)
    ?.split(" ")[0] ?? null;

  // Phase 4 trip wrap-up check (NOTIFiCATIONS_INBOX_PLAN.md §3.3b) — piggybacks
  // on the trips + memberIds already fetched above, no extra query. Deferred
  // off the render path via after(), same pattern as autoLogDueTemplates.
  const adminTripsForWrapUpCheck = trips
    .filter(({ group }) => memberIds[group.id]?.role === "admin")
    .map(({ group }) => ({
      id: group.id,
      name: group.name,
      isArchived: group.isArchived ?? false,
      endDate: group.endDate,
    }));
  if (user && adminTripsForWrapUpCheck.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    after(() => checkTripWrapUps(user.id, adminTripsForWrapUpCheck, today).catch(() => {}));
  }

  // Balance badge loading skeleton — matches the exact px-4 py-2 border-t shape
  // of GroupBalanceBadge so there's no layout shift when the balance loads.
  function balanceFallback() {
    return (
      <div className="px-4 py-2 border-t border-white/20 dark:border-slate-700/30">
        <div className="h-3 w-20 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
      </div>
    );
  }

  // ── Pre-built card elements per section ───────────────────────────────────
  // Built once here (not inline in the JSX below) so CollapsibleGroupGrid can
  // slice the array for "Show N more" — theme D, home page scale with 20+ groups.
  const tripCards = trips.map(({ group, memberCount }, index) => {
    const memberInfo = memberIds[group.id];
    return (
      <div key={group.id} data-group-card="" data-group-name={group.name.toLowerCase()}>
        <TripCard
          group={group}
          memberCount={Number(memberCount)}
          priority={index < 2}
          isPlusPlan={adminPlans[group.id] === "plus"}
          isAdmin={memberInfo?.role === "admin"}
          isLocked={lockedGroupIds.has(group.id)}
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
  });

  const nestCards = nests.map(({ group, memberCount }, index) => {
    const memberInfo = memberIds[group.id];
    return (
      <div key={group.id} data-group-card="" data-group-name={group.name.toLowerCase()}>
        <TripCard
          group={group}
          memberCount={Number(memberCount)}
          priority={index < 2 && trips.length === 0}
          isPlusPlan={adminPlans[group.id] === "plus"}
          isAdmin={memberInfo?.role === "admin"}
          isLocked={lockedGroupIds.has(group.id)}
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
  });

  const circleCards = circles.map(({ group }) => (
    <div key={group.id} data-group-card="" data-group-name={group.name.toLowerCase()}>
      <Suspense fallback={<CircleCardSkeleton />}>
        <CircleCardServer group={group} isLocked={lockedGroupIds.has(group.id)} />
      </Suspense>
    </div>
  ));

  // ─────────────────────────────────────────────────────────────────────────
  // TYPE-FILTERED VIEW — desktop sidebar navigates here (?type=trips|nests|circles)
  // A focused list of one group type: active cards, then archived below.
  // No greeting, no tabs — cleaner than the dashboard; mirrors how /stream works.
  // Mobile can reach this URL too; the page renders fine without the sidebar.
  // ─────────────────────────────────────────────────────────────────────────
  if (typeFilter) {
    const dbType      = TYPE_FILTER_MAP[typeFilter];
    const activeCards = typeFilter === "trips" ? tripCards
                      : typeFilter === "nests" ? nestCards
                      : circleCards;
    const archivedOfType = typeFilter === "trips"   ? archivedTrips
                         : typeFilter === "nests"   ? archivedNests
                         : archivedCircles;
    const activeGroups   = typeFilter === "trips"   ? trips
                         : typeFilter === "nests"   ? nests
                         : circles;

    const typeLabel  = typeFilter === "trips"   ? "Trips"
                     : typeFilter === "nests"   ? "Nests"
                     : "Circles";
    const newTypeHref = typeFilter === "trips"   ? "/groups/new?type=trip"
                      : typeFilter === "nests"   ? "/groups/new?type=nest"
                      : "/groups/new?type=circle";

    type BadgeColors = "cyan" | "emerald" | "violet";
    const badge: { bg: string; icon: string; rule: string; color: BadgeColors } =
      typeFilter === "trips"
        ? { bg: "bg-cyan-50 dark:bg-cyan-900/30",     icon: "text-cyan-600 dark:text-cyan-400",     rule: "from-cyan-300/80 dark:from-cyan-400/50",     color: "cyan"    }
        : typeFilter === "nests"
        ? { bg: "bg-emerald-50 dark:bg-emerald-900/30", icon: "text-emerald-600 dark:text-emerald-400", rule: "from-emerald-300/80 dark:from-emerald-400/50", color: "emerald" }
        : { bg: "bg-violet-50 dark:bg-violet-900/30",  icon: "text-violet-600 dark:text-violet-400",  rule: "from-violet-300/80 dark:from-violet-400/50",  color: "violet"  };

    const TypeIcon = typeFilter === "trips" ? MapPin : typeFilter === "nests" ? Building2 : Coins;

    const addBtnCls = typeFilter === "trips"
      ? "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-cyan-500/20"
      : typeFilter === "nests"
      ? "bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20"
      : "bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/20";

    const hasAny = activeGroups.length > 0 || archivedOfType.length > 0;

    return (
      <div>
        <GroupsBackGuard />

        {/* Net-position strip — always useful context even on a focused list */}
        {user && (
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

        {/* ── Section header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-4 mt-2">
          <BadgePop className={`w-6 h-6 rounded-md ${badge.bg} flex items-center justify-center shrink-0`}>
            <TypeIcon className={`w-3.5 h-3.5 ${badge.icon}`} />
          </BadgePop>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{typeLabel}</span>
          <div className={`animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r ${badge.rule} to-transparent dark:to-transparent`} />
          <Link
            href={newTypeHref}
            aria-label={`New ${typeLabel.toLowerCase().slice(0, -1)}`}
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                       ${addBtnCls}
                       text-white shadow-sm transition-all active:scale-95`}
          >
            <Plus className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ── Active cards for this type ──────────────────────────────────── */}
        {!hasAny ? (
          <EmptyTypeNudge type={dbType} />
        ) : activeGroups.length === 0 ? null : (
          <>
            <CollapsibleGroupGrid
              items={activeCards}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            />
            {typeFilter === "trips" && (
              <LongPressHint demoTripId={trips.find((g) => g.group.isDemo)?.group.id ?? null} />
            )}
          </>
        )}

        {/* ── Archived of this type ───────────────────────────────────────── */}
        {archivedOfType.length > 0 && (
          <section className="mt-8">
            {/* Archived sub-header — amber tint per CLAUDE.md conventions */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-600/80 dark:text-amber-400/70">
                Archived
              </span>
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/70 to-transparent dark:from-amber-800/40 dark:to-transparent" />
            </div>
            <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {archivedOfType.map(({ group, memberCount }) => (
                <div key={group.id}>
                  {group.groupType === "circle" ? (
                    <Suspense fallback={<CircleCardSkeleton />}>
                      <CircleCardServer group={group} isLocked={lockedGroupIds.has(group.id)} />
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
          </section>
        )}

        {/* FAB — same as the all-types view; filters to type-relevant groups */}
        {(activeGroups.length > 0 || archivedOfType.length > 0) && (
          <GlobalFab
            trips={trips}
            nests={nests}
            circles={circles}
            isPlusUser={isPlusUser}
            hasStreams={streamBadge.latestUpdatedAt !== null}
            currentUserName={user?.user_metadata?.full_name as string | undefined}
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ALL-TYPES VIEW — default /groups (no ?type= param)
  // Shows all group types together; used as the logo-click "home" destination.
  // SectionPillNav hidden on desktop (md:hidden) — sidebar handles type nav there.
  // ─────────────────────────────────────────────────────────────────────────

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
      {/* On mobile the pill nav provides scroll-spy wayfinding; on desktop the
          sidebar already does this — hide it so the pills don't stack with the
          sticky GroupDesktopNav at md+. */}
      {activeSections.length > 1 && (
        <div className="md:hidden">
          <SectionPillNav sections={activeSections} createPills={[]} />
        </div>
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
                            from-cyan-300/80 to-transparent
                            dark:from-cyan-400/50 dark:to-transparent" />
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
              <CollapsibleGroupGrid
                items={tripCards}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              />
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
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </BadgePop>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nests</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
                            from-emerald-300/80 to-transparent
                            dark:from-emerald-400/50 dark:to-transparent" />
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
            <CollapsibleGroupGrid
              items={nestCards}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initialDelayMs={trips.length > 0 ? trips.length * 80 : 0}
            />
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
                            from-violet-300/80 to-transparent
                            dark:from-violet-400/50 dark:to-transparent" />
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
            <CollapsibleGroupGrid
              items={circleCards}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initialDelayMs={(trips.length + nests.length) > 0 ? (trips.length + nests.length) * 80 : 0}
            />
          )}
        </section>
      )}
    </>
  );

  // ── Archived content ──────────────────────────────────────────────────────
  const archivedContent = (
    <>
      {/* Same md:hidden pattern — sidebar handles type nav on desktop */}
      {archivedSections.length > 1 && (
        <div className="md:hidden">
          <SectionPillNav sections={archivedSections} createPills={[]} />
        </div>
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
                            from-cyan-300/80 to-transparent
                            dark:from-cyan-400/50 dark:to-transparent" />
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
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </BadgePop>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nests</span>
            <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
                            from-emerald-300/80 to-transparent
                            dark:from-emerald-400/50 dark:to-transparent" />
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
                            from-violet-300/80 to-transparent
                            dark:from-violet-400/50 dark:to-transparent" />
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

      {/* ── What's New banner — returning users only, one-shot per version ─── */}
      {!isEmpty && <WhatsNewBanner />}

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
      {!isEmpty && (
        <GlobalFab
          trips={trips}
          nests={nests}
          circles={circles}
          isPlusUser={isPlusUser}
          hasStreams={streamBadge.latestUpdatedAt !== null}
          currentUserName={user?.user_metadata?.full_name as string | undefined}
        />
      )}

      {/* Post-seed "want a tour?" prompt (self-gates on the just-seeded flag) */}
      {demoGroups.length > 0 && <SampleTourPrompt demoTripId={demoTripId} />}
    </div>
  );
}
