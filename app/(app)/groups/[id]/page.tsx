import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getGroupName } from "@/lib/db/queries/meta";
import { getGroupTotalSpent } from "@/lib/db/queries/expenses";
import { autoLogDueTemplates } from "@/app/actions/expenses";
import { Users, Receipt, Wallet, BarChart2, Sparkles, ArrowRight, Home } from "lucide-react";
import { GroupHeroHub } from "@/components/trip/group-hero-hub";
import { CircleDashboard } from "@/components/circle/circle-dashboard";
import { BackButton } from "@/components/shared/back-button";
import Link from "next/link";
import Image from "next/image";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BudgetBar } from "@/components/trip/budget-bar";
import { getGroupConfig } from "@/lib/group-config";
import type { Metadata } from "next";
import { TripCardShareDrawer } from "@/components/trip/trip-card-share-drawer";
import { GroupActivityFeed, ActivityFeedSkeleton } from "@/components/trip/group-activity-feed";
import { SettleBalanceBadge, SettleBalanceSkeleton } from "@/components/trip/settle-balance-badge";
import { InsightsSummaryBadge, InsightsSummaryBadgeSkeleton } from "@/components/trip/insights-summary-badge";
import { NestMonthlyBadge, NestMonthlyBadgeSkeleton } from "@/components/trip/nest-monthly-badge";
import { RepeatTripPrompt } from "@/components/trip/repeat-trip-prompt";
import { HeroBalancePill } from "@/components/trip/hero-balance-pill";
import {
  TRIP_TREE_DARK, TRIP_PATTERN_STYLE,
  NEST_BUILDING_DARK, NEST_PATTERN_STYLE,
} from "@/lib/group-patterns";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `${name} | Clear` : "Clear" };
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [data, totalSpent] = await Promise.all([
    getGroupWithMembers(id),
    getGroupTotalSpent(id),
  ]);
  if (!data) notFound();

  const { group, members, currentMember, currentUser } = data;
  const config  = getGroupConfig(group.groupType);
  const isAdmin = currentMember?.role === "admin";
  const isNest  = group.groupType === "nest";

  // ── Circle groups get their own dedicated dashboard ───────────────────────
  if (config.isCircle) {
    return (
      <CircleDashboard
        group={group}
        members={members}
        currentMember={currentMember}
        selectedPeriod={sp.period}
      />
    );
  }

  // Show the repeat-trip prompt when the trip has ended or is archived (trips only, admins only)
  const today = new Date().toISOString().slice(0, 10);
  const isTripComplete =
    !isNest && isAdmin && (group.isArchived || (!!group.endDate && group.endDate < today));
  // Member names to copy — everyone except the current user
  const repeatMemberNames = isTripComplete
    ? members
        .filter((m) => m.userId !== currentUser.id)
        .map((m) => m.displayName ?? m.guestName ?? "")
        .filter(Boolean)
    : [];

  if (isNest) await autoLogDueTemplates(group.id).catch(() => {});
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${group.shareToken}`;

  return (
    <div>
      {/* Desktop-only back link — mobile nav handles it */}
      <BackButton
        href="/groups"
        label="All groups"
        className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      />

      {/* Hero */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <div className="h-52 relative">
          {group.coverPhotoUrl ? (
            <Image
              src={group.coverPhotoUrl}
              alt={group.name}
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
              priority
            />
          ) : (
            // No cover photo: identity-coloured gradient + same tree/building
            // pattern as the home-page card for visual continuity card → dashboard.
            // The dark overlay fades from transparent (top) to slate-900/70 (bottom),
            // so the pattern shows clearly at the top and naturally hides near the text.
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${isNest ? "from-emerald-500 to-teal-500" : "from-cyan-500 to-teal-500"}`} />
              {/* Pattern — white shapes, same tile as card dark mode */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: isNest ? NEST_BUILDING_DARK : TRIP_TREE_DARK,
                  ...(isNest ? NEST_PATTERN_STYLE : TRIP_PATTERN_STYLE),
                }}
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
          {/* Hero action buttons — DESKTOP ONLY. On mobile the GroupMobileNav ⋯
              (sticky top-right header) already exposes the hub + share, so these
              are redundant; hidden below md to avoid the duplicate controls. */}
          {currentMember && (
            <div className="absolute top-3 right-3 hidden md:flex items-center gap-2 z-10">
              <GroupHeroHub
                groupId={group.id}
                groupName={group.name}
                groupType={group.groupType}
                currency={group.defaultCurrency}
                isArchived={group.isArchived ?? false}
                isAdmin={isAdmin}
                joinUrl={inviteUrl}
                groupStartDate={group.startDate}
                groupEndDate={group.endDate}
              />
              {isAdmin && (
                <TripCardShareDrawer url={inviteUrl} groupName={group.name} />
              )}
            </div>
          )}
          <div className="absolute bottom-4 left-5 right-5">
            <h1 className="text-white text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              {group.name}
            </h1>
            {/* Date / member count row + personal net pill side-by-side */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isNest ? (
                <p className="text-white/75 text-sm">{members.length} {members.length === 1 ? "member" : "members"}</p>
              ) : (group.startDate || group.endDate) ? (
                <p className="text-white/75 text-sm">
                  {group.startDate ? formatDate(group.startDate) : ""}
                  {group.startDate && group.endDate ? " → " : ""}
                  {group.endDate ? formatDate(group.endDate) : ""}
                </p>
              ) : null}
              {/* Personal net — streamed; Suspense fallback = null so hero renders instantly */}
              {currentMember && !group.isArchived && (
                <Suspense fallback={null}>
                  <HeroBalancePill
                    groupId={group.id}
                    currentMemberId={currentMember.id}
                    defaultCurrency={group.defaultCurrency}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
        {group.description && (
          <div className="px-5 py-3 border-t border-white/30 dark:border-slate-700/40">
            <p className="text-slate-600 dark:text-slate-300 text-sm">{group.description}</p>
          </div>
        )}
      </div>

      {/* Quick actions — Expenses + Settle up lead on mobile (most-used first row) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-tour="trip-quick-actions">
        {/* 1 — Expenses (most frequent action) */}
        <Link href={`/groups/${group.id}/expenses`} className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5 transition-all">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-500/30">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Expenses</p>
            {isNest ? (
              <Suspense fallback={<NestMonthlyBadgeSkeleton />}>
                <NestMonthlyBadge groupId={group.id} defaultCurrency={group.defaultCurrency} />
              </Suspense>
            ) : (
              <p className="text-xs text-cyan-600 dark:text-cyan-400">
                {totalSpent > 0
                  ? formatCurrency(totalSpent, group.defaultCurrency)
                  : "No expenses yet"}
              </p>
            )}
          </div>
        </Link>

        {/* 2 — Settle up (most urgent question: what do I owe?) */}
        <Link href={`/groups/${group.id}/settle`} className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Settle up</p>
            <Suspense fallback={<SettleBalanceSkeleton />}>
              {currentMember ? (
                <SettleBalanceBadge
                  groupId={group.id}
                  currentMemberId={currentMember.id}
                  defaultCurrency={group.defaultCurrency}
                />
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">Who owes whom</p>
              )}
            </Suspense>
          </div>
        </Link>

        {/* 3 — Members */}
        <Link href={`/groups/${group.id}/members`} className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm shadow-violet-500/30">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{config.labels.members}</p>
            <p className="text-xs text-violet-500 dark:text-violet-400">{members.length} {members.length === 1 ? "person" : "people"}</p>
          </div>
        </Link>

        {/* 4 — Insights */}
        <Link href={`/groups/${group.id}/insights`} className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 transition-all">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-sm shadow-amber-500/30">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Insights</p>
            <Suspense fallback={<InsightsSummaryBadgeSkeleton />}>
              <InsightsSummaryBadge groupId={group.id} />
            </Suspense>
          </div>
        </Link>
      </div>

      {/* Activity feed — most dynamic content, gets prime position */}
      <div className="mb-6">
        <Suspense fallback={<ActivityFeedSkeleton />}>
          <GroupActivityFeed
            groupId={id}
            currentMemberId={currentMember?.id}
            groupType={group.groupType}
          />
        </Suspense>
      </div>

      {/* Budget bar — links to insights for drill-down */}
      {config.showBudget && group.budget && (
        <div className="mb-6">
          <Link href={`/groups/${group.id}/insights`} className="block group/budget">
            <BudgetBar spent={totalSpent} budget={Number(group.budget)} currency={group.defaultCurrency} />
          </Link>
        </div>
      )}

      {/* Trip summary — deepest feature, retrospective view, earns its place at the bottom */}
      {!isNest && (
        <Link
          href={`/summary/${group.summaryToken}`}
          className="glass rounded-xl p-4 flex items-center gap-3 mb-6 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Trip Summary</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">View and share your trip story</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 transition-colors shrink-0" />
        </Link>
      )}

      {/* Repeat-trip prompt — shown when trip is complete/archived, admin only */}
      {isTripComplete && (
        <RepeatTripPrompt
          groupId={group.id}
          groupName={group.name}
          memberNames={repeatMemberNames}
          defaultCurrency={group.defaultCurrency}
        />
      )}

    </div>
  );
}
