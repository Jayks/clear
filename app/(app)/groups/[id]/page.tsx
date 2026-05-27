import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getGroupName } from "@/lib/db/queries/meta";
import { getGroupTotalSpent } from "@/lib/db/queries/expenses";
import { autoLogDueTemplates } from "@/app/actions/expenses";
import { ArrowLeft, Users, Receipt, Wallet, BarChart2, Pencil, Sparkles, ArrowRight, Home } from "lucide-react";
import { TripCardQuickAdd } from "@/components/trip/trip-card-quick-add";
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `${name} | Clear` : "Clear" };
}

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, totalSpent] = await Promise.all([
    getGroupWithMembers(id),
    getGroupTotalSpent(id),
  ]);
  if (!data) notFound();

  const { group, members, currentMember } = data;
  const isAdmin = currentMember?.role === "admin";
  const isNest = group.groupType === "nest";

  if (isNest) await autoLogDueTemplates(group.id).catch(() => {});
  const config = getGroupConfig(group.groupType);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${group.shareToken}`;

  return (
    <div>
      {/* Desktop-only back link — mobile nav handles it */}
      <Link
        href="/groups"
        className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All groups
      </Link>

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
            <div className={`w-full h-full bg-gradient-to-br ${isNest ? "from-teal-500 to-emerald-500" : "from-cyan-500 to-teal-500"}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
          {/* Hero action buttons — quick-add for all members, share+edit for admins only */}
          {currentMember && (
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <TripCardQuickAdd
                groupId={group.id}
                groupName={group.name}
                groupType={group.groupType}
                currency={group.defaultCurrency}
                groupStartDate={group.startDate}
                groupEndDate={group.endDate}
              />
              {isAdmin && (
                <>
                  <TripCardShareDrawer url={inviteUrl} groupName={group.name} />
                  <Link
                    href={`/groups/${group.id}/edit`}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-black/30 hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/20 active:scale-95 transition-all"
                    title={`Edit ${config.labels.singular.toLowerCase()}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          )}
          <div className="absolute bottom-4 left-5 right-5">
            <h1 className="text-white text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              {group.name}
            </h1>
            {isNest ? (
              <p className="text-white/75 text-sm mt-1">{members.length} {members.length === 1 ? "member" : "members"}</p>
            ) : (group.startDate || group.endDate) ? (
              <p className="text-white/75 text-sm mt-1">
                {group.startDate ? formatDate(group.startDate) : ""}
                {group.startDate && group.endDate ? " → " : ""}
                {group.endDate ? formatDate(group.endDate) : ""}
              </p>
            ) : null}
          </div>
        </div>
        {group.description && (
          <div className="px-5 py-3 border-t border-white/30 dark:border-slate-700/40">
            <p className="text-slate-600 dark:text-slate-300 text-sm">{group.description}</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-tour="trip-quick-actions">
        <Link href={`/groups/${group.id}/members`} className="glass rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm shadow-violet-500/30">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{config.labels.members}</p>
            <p className="text-xs text-violet-500 dark:text-violet-400">{members.length} {members.length === 1 ? "person" : "people"}</p>
          </div>
        </Link>

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

      {/* Trip summary — trips only */}
      {!isNest && (
        <Link
          href={`/summary/${group.shareToken}`}
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

      {/* Budget bar */}
      {config.showBudget && group.budget && (
        <div className="mb-4">
          <BudgetBar spent={totalSpent} budget={Number(group.budget)} currency={group.defaultCurrency} />
        </div>
      )}

      {/* Activity feed */}
      <div className="mb-6">
        <Suspense fallback={<ActivityFeedSkeleton />}>
          <GroupActivityFeed
            groupId={id}
            currentMemberId={currentMember?.id}
            groupType={group.groupType}
          />
        </Suspense>
      </div>

    </div>
  );
}
