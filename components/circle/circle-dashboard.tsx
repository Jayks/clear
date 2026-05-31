import Link from "next/link";
import { ArrowLeft, Users, Receipt, Pencil, Plus } from "lucide-react";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { getCircleDashboardData } from "@/lib/db/queries/circle";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CircleCycleNav } from "./circle-cycle-nav";
import { CircleChipGrid } from "./circle-chip-grid";
import { CircleReminderButton } from "./circle-reminder-button";
import { CircleGoalCelebration } from "./circle-goal-celebration";
import { CircleGoalStatus } from "./circle-goal-status";
import { TripCardShareDrawer } from "@/components/trip/trip-card-share-drawer";
import { CategoryIcon } from "@/components/expense/category-icon";
import { Coins, Repeat2, Target } from "lucide-react";

interface Props {
  group:          Group;
  members:        GroupMember[];
  currentMember:  GroupMember | null | undefined;
  selectedPeriod: string | undefined;
}

export async function CircleDashboard({ group, members, currentMember, selectedPeriod }: Props) {
  const isRecurring = group.circleMode === "recurring";
  const isGoal      = group.circleMode === "goal";
  const isAdmin     = currentMember?.role === "admin";
  const amount      = group.contributionAmount ? Number(group.contributionAmount) : null;

  const dash = await getCircleDashboardData(
    group.id,
    group.circleMode,
    selectedPeriod ?? null,
    amount,
  );

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = `${appUrl}/join/${group.shareToken}`;

  // Runway health signal
  const runwayHealth =
    dash.runwayMonths === null ? null
    : dash.runwayMonths > 2   ? { color: "text-emerald-600 dark:text-emerald-400", dot: "🟢", label: `${dash.runwayMonths}mo runway` }
    : dash.runwayMonths >= 1  ? { color: "text-amber-600 dark:text-amber-400",  dot: "🟡", label: `${dash.runwayMonths}mo runway` }
    :                           { color: "text-red-600 dark:text-red-400",       dot: "🔴", label: `${dash.runwayMonths}mo runway` };

  // Progress
  const targetNum  = isGoal && group.targetAmount ? Number(group.targetAmount) : null;
  const progressPct = targetNum
    ? Math.min(100, (dash.allTimeCollected / targetNum) * 100)
    : dash.memberStatuses.length > 0
    ? Math.min(100, (dash.paidCount / dash.memberStatuses.length) * 100)
    : 0;

  // Days until goal deadline
  const daysLeft = isGoal && group.eventDate
    ? Math.max(0, Math.ceil((new Date(group.eventDate).getTime() - Date.now()) / 86_400_000))
    : null;

  // Contribution privacy — hide ₹ totals from non-admins for goal mode
  const hideAmounts = isGoal && group.contributionPrivacy === "admin_only" && !isAdmin;

  // Goal-hit detection
  const goalHit = isGoal && targetNum !== null && dash.allTimeCollected >= targetNum;

  // Pending member names for the reminder
  const pendingNames = dash.memberStatuses.filter((m) => !m.isPaid).map((m) => m.name);

  return (
    <div>
      {/* Desktop back link */}
      <Link
        href="/groups"
        className="hidden md:inline-flex items-center gap-1.5 min-h-[44px]
                   text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
                   text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All groups
      </Link>

      {/* ── Hero card ───────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        {/* Gradient header */}
        <div className={`h-32 relative flex items-end px-5 pb-4 bg-gradient-to-br
          ${isGoal ? "from-rose-500 to-pink-600" : "from-violet-600 to-purple-700"}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Admin actions */}
          {isAdmin && (
            <div className="absolute top-3 right-3 flex gap-2 z-10">
              <TripCardShareDrawer url={joinUrl} groupName={group.name} />
              <Link
                href={`/groups/${group.id}/edit`}
                className="w-9 h-9 rounded-xl flex items-center justify-center
                           text-white bg-black/30 hover:bg-black/50 backdrop-blur-md
                           shadow-sm shadow-black/20 active:scale-95 transition-all"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="relative z-10">
            {/* Mode badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide
                               bg-white/20 text-white px-2 py-0.5 rounded-full">
                {isGoal ? <Target className="w-2.5 h-2.5" /> : <Repeat2 className="w-2.5 h-2.5" />}
                {isGoal ? "one-time goal" : "recurring"}
              </span>
              {isGoal && daysLeft !== null && (
                <span className={`text-xs font-medium text-white/80 ${daysLeft <= 3 ? "!text-red-300" : ""}`}>
                  {daysLeft === 0 ? "deadline today!" : `${daysLeft} days left`}
                </span>
              )}
            </div>
            <h1 className="text-white text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              {group.name}
            </h1>
          </div>
        </div>

        {/* Progress section */}
        <div className="px-5 py-4 space-y-3">
          {/* Cycle nav — recurring only */}
          {isRecurring && (
            <CircleCycleNav
              groupId={group.id}
              prev={dash.prevPeriod}
              current={dash.selectedPeriod}
              next={dash.nextPeriod}
              label={dash.selectedPeriodLabel}
              canGoNext={!dash.isCurrentPeriod}
            />
          )}

          {/* Committed line — recurring */}
          {isRecurring && amount && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dash.memberStatuses.length} × {formatCurrency(amount, group.defaultCurrency)} ={" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatCurrency(amount * dash.memberStatuses.length, group.defaultCurrency)}
              </span>{" "}
              committed this cycle
            </p>
          )}

          {/* Progress bar + fraction */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              {targetNum ? (
                hideAmounts ? (
                  // Privacy: non-admin sees count only, not ₹ totals
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {dash.paidCount}/{dash.memberStatuses.length}
                    <span className="text-slate-400 dark:text-slate-500 font-normal"> contributed</span>
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(dash.allTimeCollected, group.defaultCurrency)}
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      {" "}/ {formatCurrency(targetNum, group.defaultCurrency)}
                    </span>
                  </span>
                )
              ) : (
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  {formatCurrency(dash.cycleCollected, group.defaultCurrency)}
                  <span className="text-slate-400 dark:text-slate-500 font-normal"> collected</span>
                </span>
              )}
              <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {dash.paidCount}/{dash.memberStatuses.length} {isGoal ? "contributed" : "paid"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progressPct >= 100
                    ? "bg-gradient-to-r from-emerald-400 to-green-500"
                    : isGoal
                    ? "bg-gradient-to-r from-rose-400 to-pink-500"
                    : "bg-gradient-to-r from-violet-500 to-purple-600"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Pool balance + runway (below progress bar) */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Wallet balance:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {formatCurrency(dash.poolBalance, group.defaultCurrency)}
              </span>
            </span>
            {runwayHealth && (
              <span className={`text-xs font-medium ${runwayHealth.color}`}>
                {runwayHealth.dot} {runwayHealth.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Goal celebration (100% reached) ──────────────────────────────────── */}
      {isGoal && goalHit && targetNum && (
        <CircleGoalCelebration
          groupId={group.id}
          collectedAmount={dash.allTimeCollected}
          targetAmount={targetNum}
          currency={group.defaultCurrency}
        />
      )}

      {/* ── Personal status card (member view) ──────────────────────────────── */}
      {/* Recurring — current period only */}
      {!isAdmin && isRecurring && dash.isCurrentPeriod && (
        <div className={`glass rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 border-l-4 ${
          dash.currentUserPaid
            ? "border-emerald-400 dark:border-emerald-600"
            : "border-amber-400 dark:border-amber-600"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            dash.currentUserPaid
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-amber-100 dark:bg-amber-900/30"
          }`}>
            <span className="text-base">{dash.currentUserPaid ? "✓" : "⏳"}</span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              dash.currentUserPaid
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            }`}>
              {dash.currentUserPaid
                ? `You're clear for ${dash.selectedPeriodLabel}`
                : `Your ${dash.selectedPeriodLabel} contribution is pending`}
            </p>
            {dash.currentUserPaid && dash.myContributionDate && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatCurrency(dash.myContributionAmount ?? 0, group.defaultCurrency)} confirmed · {dash.myContributionDate}
              </p>
            )}
            {!dash.currentUserPaid && amount && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatCurrency(amount, group.defaultCurrency)} due
              </p>
            )}
          </div>
        </div>
      )}

      {/* Goal mode — personal status card for non-admin members */}
      {!isAdmin && isGoal && (
        <div className={`glass rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 border-l-4 ${
          dash.currentUserPaid
            ? "border-emerald-400 dark:border-emerald-600"
            : "border-rose-400 dark:border-rose-600"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            dash.currentUserPaid
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-rose-100 dark:bg-rose-900/30"
          }`}>
            <span className="text-base">{dash.currentUserPaid ? "✓" : "⏳"}</span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              dash.currentUserPaid
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-rose-700 dark:text-rose-300"
            }`}>
              {dash.currentUserPaid ? "You've contributed" : "Your contribution is pending"}
            </p>
            {dash.currentUserPaid && dash.myContributionDate && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatCurrency(dash.myContributionAmount ?? 0, group.defaultCurrency)} · {dash.myContributionDate}
              </p>
            )}
            {!dash.currentUserPaid && amount && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatCurrency(amount, group.defaultCurrency)} expected
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Chip grid ───────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Members</span>
            <div className="flex-1 h-[1.5px] w-12 bg-gradient-to-r from-violet-200/70 to-transparent dark:from-violet-800/40 dark:to-transparent" />
          </div>
          <Link
            href={`/groups/${group.id}/members`}
            className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline"
          >
            Manage →
          </Link>
        </div>

        {isAdmin && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            Tap a pending chip to record contribution
          </p>
        )}

        <CircleChipGrid
          members={dash.memberStatuses}
          isAdmin={isAdmin}
          currentMemberId={dash.currentMemberId}
          amount={amount}
          currency={group.defaultCurrency}
          period={isRecurring ? dash.selectedPeriod : null}
          periodLabel={isRecurring ? dash.selectedPeriodLabel : null}
          groupId={group.id}
        />
      </div>

      {/* ── Send reminder (admin, when pending members exist) ────────────────── */}
      {isAdmin && dash.pendingCount > 0 && (
        <CircleReminderButton
          circleName={group.name}
          periodLabel={isRecurring ? dash.selectedPeriodLabel : null}
          paidCount={dash.paidCount}
          totalCount={dash.memberStatuses.length}
          pendingNames={pendingNames}
          amount={amount}
          currency={group.defaultCurrency}
          upiId={group.upiId ?? null}
          joinUrl={joinUrl}
        />
      )}

      {/* ── Goal lifecycle status (goal mode only) ──────────────────────────── */}
      {isGoal && (
        <CircleGoalStatus
          groupId={group.id}
          status={group.circleStatus}
          isAdmin={isAdmin}
          poolBalance={dash.poolBalance}
          allTimeExpenses={dash.allTimeExpenses}
          allTimeCollected={dash.allTimeCollected}
          currency={group.defaultCurrency}
        />
      )}

      {/* ── Recent wallet expenses ───────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
              <Receipt className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Wallet expenses</span>
            <div className="flex-1 h-[1.5px] w-12 bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
          </div>
          <Link
            href={`/groups/${group.id}/expenses`}
            className="text-xs text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
          >
            View all →
          </Link>
        </div>

        {/* Summary line */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {formatCurrency(dash.allTimeExpenses, group.defaultCurrency)} drawn from wallet
        </p>

        {/* Recent rows */}
        {dash.recentExpenses.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
            No expenses logged yet.
          </p>
        ) : (
          <div className="space-y-1">
            {dash.recentExpenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-2.5 py-1.5">
                <CategoryIcon category={exp.category} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{exp.description}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(exp.expenseDate)}
                    </span>
                    {exp.isAdvance && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          Advanced by {exp.paidByName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums shrink-0">
                  {formatCurrency(exp.amount, group.defaultCurrency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Admin CTA */}
        {isAdmin && (
          <Link
            href={`/groups/${group.id}/expenses/new`}
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5
                       bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700
                       text-white text-sm font-medium rounded-xl px-4 py-2.5
                       shadow-sm shadow-violet-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Log wallet expense
          </Link>
        )}
      </div>

      {/* ── Members quick link ────────────────────────────────────────────────── */}
      <div className="mt-3">
        <Link
          href={`/groups/${group.id}/members`}
          className="glass rounded-xl p-4 flex items-center gap-3
                     hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm shadow-violet-500/30">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Members</p>
            <p className="text-xs text-violet-500 dark:text-violet-400">
              {dash.memberStatuses.length} {dash.memberStatuses.length === 1 ? "person" : "people"}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
