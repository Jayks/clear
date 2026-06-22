import Link from "next/link";
import Image from "next/image";
import { Users, Receipt, Pencil, Plus, Check, Clock } from "lucide-react";
import type { Group } from "@/lib/db/schema/groups";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { getCircleDashboardData } from "@/lib/db/queries/circle";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CircleCycleNav } from "./circle-cycle-nav";
import { CircleContributionRoster } from "./circle-contribution-roster";
import { CircleReminderButton } from "./circle-reminder-button";
import { CircleGoalCelebration } from "./circle-one-time-celebration";
import { CircleGoalStatus } from "./circle-one-time-status";
import { CircleBatchConfirmBanner } from "./circle-batch-confirm-banner";
import { CircleContributeAction } from "./circle-contribute-action";
import { TripCardShareDrawer } from "@/components/trip/trip-card-share-drawer";
import { CategoryIcon } from "@/components/expense/category-icon";
import { Coins, Repeat2, Target } from "lucide-react";
import { BackButton } from "@/components/shared/back-button";
import { getContextTheme } from "@/lib/theme/context-theme";
import { Lock } from "lucide-react";

interface Props {
  group:          Group;
  members:        GroupMember[];
  currentMember:  GroupMember | null | undefined;
  selectedPeriod: string | undefined;
  /** Overflow read-only lock (RAZORPAY_PLAN.md §9) — see TripCard's isLocked doc. */
  isLocked?: boolean;
}

export async function CircleDashboard({ group, members, currentMember, selectedPeriod, isLocked = false }: Props) {
  const isRecurring = group.circleMode === "recurring";
  const isOneTime   = group.circleMode === "one_time";
  const isFixed     = isOneTime && group.contributionAmount !== null;
  const isFlexi     = isOneTime && group.contributionAmount === null;
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

  // ── Context colour ───────────────────────────────────────────────────────
  // Circles read in their mode's identity: recurring → violet, one-time → amber.
  // Every section badge/rule/link/button derives from this; the section icon
  // differentiates the panel. Resolves the old indigo/violet/cyan mix.
  const theme        = getContextTheme("circle", group.circleMode);
  // Hero stays a soft tinted gradient + pattern (not the solid theme.gradient)
  // unless a cover photo is set — then it shows the photo with a dark overlay,
  // same as trip/nest dashboards.
  const heroGrad     = isOneTime
    ? "from-orange-50 to-amber-100 dark:from-slate-800 dark:to-amber-900"
    : "from-slate-100 to-violet-100 dark:from-slate-800 dark:to-violet-900";
  const hasCover     = !!group.coverPhotoUrl;
  const progressCls  = theme.gradient;
  const sectionBg    = theme.headerBadgeBg;
  const sectionIcon  = theme.headerIcon;
  const sectionRule  = theme.rule;
  const linkCls      = theme.accentText;

  // Runway health signal
  const runwayHealth =
    dash.runwayMonths === null ? null
    : dash.runwayMonths > 2   ? { color: "text-emerald-600 dark:text-emerald-400", dot: "🟢", label: `${dash.runwayMonths}mo runway` }
    : dash.runwayMonths >= 1  ? { color: "text-amber-600 dark:text-amber-400",  dot: "🟡", label: `${dash.runwayMonths}mo runway` }
    :                           { color: "text-red-600 dark:text-red-400",       dot: "🔴", label: `${dash.runwayMonths}mo runway` };

  // Progress
  const targetNum  = isOneTime && group.targetAmount ? Number(group.targetAmount) : null;
  const progressPct = targetNum
    ? Math.min(100, (dash.allTimeCollected / targetNum) * 100)
    : dash.memberStatuses.length > 0
    ? Math.min(100, (dash.paidCount / dash.memberStatuses.length) * 100)
    : 0;

  // Days until one-time deadline
  const daysLeft = isOneTime && group.eventDate
    ? Math.max(0, Math.ceil((new Date(group.eventDate).getTime() - Date.now()) / 86_400_000))
    : null;

  // Contribution privacy — hide ₹ totals from non-admins for one-time mode
  const hideAmounts = isOneTime && group.contributionPrivacy === "admin_only" && !isAdmin;

  // Goal-hit detection
  const goalHit = isOneTime && targetNum !== null && dash.allTimeCollected >= targetNum;

  // BUG-08 fix: pendingMembers for the WhatsApp reminder should only include
  // members who genuinely haven't paid yet — exclude those who self-reported
  // (isPendingConfirm=true) since they've already indicated payment.
  // M2: pass { id, name, isGuest } so CircleReminderButton can generate per-ghost tokens.
  const pendingMembers = dash.memberStatuses
    .filter((m) => !m.isPaid && !m.isPendingConfirm)
    .map((m) => ({ id: m.id, name: m.name, isGuest: m.isGuest }));

  // Current member's pending-confirm status (shown in hero action zone)
  const myMemberStatus = dash.currentMemberId
    ? dash.memberStatuses.find((m) => m.id === dash.currentMemberId) ?? null
    : null;
  const myPendingConfirm = myMemberStatus?.isPendingConfirm ?? false;

  // Show hero action zone on current period (recurring) or always (one-time)
  const showActionZone = dash.currentMemberId && ((isRecurring && dash.isCurrentPeriod) || isOneTime);

  return (
    <div>
      {/* Desktop back link */}
      <BackButton
        href="/groups"
        label="All groups"
        className="hidden md:inline-flex items-center gap-1.5 min-h-[44px]
                   text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
                   text-sm font-medium mb-6 transition-colors"
      />

      {/* Overflow-locked banner (RAZORPAY_PLAN.md §9) — read-only until reactivated */}
      {isLocked && (
        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/70 dark:border-violet-800/40 px-4 py-3 mb-6 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-800 dark:text-violet-300">
              This circle is read-only
            </p>
            <p className="text-xs text-violet-700/80 dark:text-violet-400/80 mt-0.5">
              It&apos;s beyond the free plan&apos;s 5-active-group limit. Everything is still visible — new contributions and wallet expenses are paused until {isAdmin ? "you reactivate Plus or archive down to 5." : "the admin reactivates Plus or archives down to 5."}
            </p>
            {isAdmin && (
              <Link href="/upgrade" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 mt-1.5">
                Reactivate with Plus →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Hero card ───────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        {/* Gradient header */}
        <div className={`h-44 relative flex items-end px-5 pb-4 ${hasCover ? "" : `bg-gradient-to-br ${heroGrad}`}`}>
          {hasCover && (
            <>
              {/* Cover photo + dark legibility overlay (matches trip/nest hero) */}
              <Image
                src={group.coverPhotoUrl!}
                alt={group.name}
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
            </>
          )}
          {/* Legibility overlay — subtle in light mode, stronger in dark */}
          {!hasCover && <div className="absolute inset-0 bg-gradient-to-t
            from-black/8 via-transparent to-transparent
            dark:from-black/50 dark:via-black/10 dark:to-transparent" />}

          {/* Light mode: coloured pattern */}
          {!hasCover && <div
            className="absolute inset-0 pointer-events-none dark:hidden"
            style={isRecurring ? {
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Cline x1='0' y1='30' x2='200' y2='30' stroke='%238b5cf6' stroke-width='0.5' stroke-opacity='0.18' stroke-dasharray='4 3'/%3E%3Cpath d='M0,30 C55,2 100,2 100,30 S145,58 200,30' stroke='%238b5cf6' stroke-width='2' stroke-opacity='0.22' fill='none'/%3E%3Ccircle cx='0' cy='30' r='2.5' fill='%238b5cf6' fill-opacity='0.22'/%3E%3Ccircle cx='71' cy='9' r='2.5' fill='%238b5cf6' fill-opacity='0.28'/%3E%3Ccircle cx='100' cy='30' r='2.5' fill='%238b5cf6' fill-opacity='0.22'/%3E%3Ccircle cx='129' cy='51' r='2.5' fill='%238b5cf6' fill-opacity='0.28'/%3E%3C/svg%3E")`,
              backgroundSize: "200px 60px",
              backgroundRepeat: "repeat",
            } : {
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Cline x1='20' y1='40' x2='20' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='20' cy='38' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3Cline x1='58' y1='24' x2='58' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='58' cy='22' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3Cline x1='96' y1='44' x2='96' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='96' cy='42' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3Cline x1='132' y1='30' x2='132' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='132' cy='28' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3Cline x1='170' y1='36' x2='170' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='170' cy='34' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3C/svg%3E")`,
              backgroundSize: "200px 60px",
              backgroundRepeat: "repeat",
            }}
          />}
          {/* Dark mode: white pattern */}
          {!hasCover && <div
            className="absolute inset-0 pointer-events-none hidden dark:block"
            style={isRecurring ? {
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Cline x1='0' y1='30' x2='200' y2='30' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.07' stroke-dasharray='4 3'/%3E%3Cpath d='M0,30 C55,2 100,2 100,30 S145,58 200,30' stroke='%23ffffff' stroke-width='1.5' stroke-opacity='0.10' fill='none'/%3E%3Ccircle cx='0' cy='30' r='2.5' fill='%23ffffff' fill-opacity='0.12'/%3E%3Ccircle cx='71' cy='9' r='2.5' fill='%23ffffff' fill-opacity='0.16'/%3E%3Ccircle cx='100' cy='30' r='2.5' fill='%23ffffff' fill-opacity='0.12'/%3E%3Ccircle cx='129' cy='51' r='2.5' fill='%23ffffff' fill-opacity='0.16'/%3E%3C/svg%3E")`,
              backgroundSize: "200px 60px",
              backgroundRepeat: "repeat",
            } : {
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Cline x1='20' y1='40' x2='20' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='20' cy='38' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3Cline x1='58' y1='24' x2='58' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='58' cy='22' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3Cline x1='96' y1='44' x2='96' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='96' cy='42' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3Cline x1='132' y1='30' x2='132' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='132' cy='28' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3Cline x1='170' y1='36' x2='170' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='170' cy='34' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3C/svg%3E")`,
              backgroundSize: "200px 60px",
              backgroundRepeat: "repeat",
            }}
          />}


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
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide
                               backdrop-blur-sm px-2 py-0.5 rounded-full ${
                                 hasCover ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/20 text-slate-700 dark:text-white"
                               }`}>
                {isOneTime ? <Target className="w-2.5 h-2.5" /> : <Repeat2 className="w-2.5 h-2.5" />}
                {isOneTime ? "one-time" : "recurring"}
              </span>
              {isOneTime && daysLeft !== null && (
                <span className={`text-xs font-medium ${hasCover ? "text-white/80" : "text-slate-600 dark:text-white/80"} ${daysLeft <= 3 ? "!text-red-500 dark:!text-red-300" : ""}`}>
                  {daysLeft === 0 ? "deadline today!" : `${daysLeft} days left`}
                </span>
              )}
            </div>
            <h1 className={`${hasCover ? "text-white" : "text-slate-800 dark:text-white"} text-2xl`} style={{ fontFamily: "var(--font-fraunces)" }}>
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
                  {formatCurrency(isFlexi ? dash.allTimeCollected : dash.cycleCollected, group.defaultCurrency)}
                  <span className="text-slate-400 dark:text-slate-500 font-normal"> collected</span>
                </span>
              )}
              <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {dash.paidCount}/{dash.memberStatuses.length} {isOneTime ? "contributed" : "paid"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
                  progressPct >= 100
                    ? "from-emerald-400 to-green-500"
                    : progressCls
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Wallet balance + runway (runway hidden when expense tracking is off) */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Wallet balance:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {formatCurrency(dash.poolBalance, group.defaultCurrency)}
              </span>
            </span>
            {runwayHealth && group.walletExpensesEnabled && (
              <span className={`text-xs font-medium ${runwayHealth.color}`}>
                {runwayHealth.dot} {runwayHealth.label}
              </span>
            )}
          </div>
        </div>

        {/* ── Action zone — personal status + CTA, role-aware ─────────────── */}
        {showActionZone && (
          <div className="border-t border-slate-200/60 dark:border-slate-700/40 px-5 py-3">
            {isAdmin ? (
              // Admin: simple one-liner — recording happens via the chip grid
              myMemberStatus?.isPaid ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">
                    {isRecurring
                      ? `You're clear for ${dash.selectedPeriodLabel}`
                      : "You've contributed"}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tap your chip below to record your own contribution
                </p>
              )
            ) : (
              // Member: full contribute action
              <CircleContributeAction
                groupId={group.id}
                groupName={group.name}
                isPaid={dash.currentUserPaid}
                isPendingConfirm={myPendingConfirm}
                amount={amount}
                currency={group.defaultCurrency}
                period={isRecurring ? dash.selectedPeriod : null}
                periodLabel={isRecurring ? dash.selectedPeriodLabel : null}
                isRecurring={isRecurring}
                upiId={group.upiId ?? null}
                size="dashboard"
                circleMode={(group.circleMode as "recurring" | "one_time") ?? undefined}
                contributionDate={dash.myContributionDate}
                contributionAmount={dash.myContributionAmount}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Batch confirm banner (admin, when members have self-reported) ─── */}
      {isAdmin && dash.pendingConfirmMembers.length > 0 && (
        <CircleBatchConfirmBanner
          groupId={group.id}
          pendingMembers={dash.pendingConfirmMembers}
          periodLabel={isRecurring ? dash.selectedPeriodLabel : null}
        />
      )}

      {/* ── One-time celebration (100% reached) ─────────────────────────── */}
      {isOneTime && goalHit && targetNum && (
        <CircleGoalCelebration
          groupId={group.id}
          collectedAmount={dash.allTimeCollected}
          targetAmount={targetNum}
          currency={group.defaultCurrency}
          isFlexi={isFlexi}
        />
      )}

      {/* ── Contribution roster ─────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-6 h-6 rounded-md ${sectionBg} flex items-center justify-center shrink-0`}>
              <Users className={`w-3.5 h-3.5 ${sectionIcon}`} />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isRecurring ? dash.selectedPeriodLabel : "Contributors"}
            </span>
            <div className={`flex-1 h-[1.5px] w-12 bg-gradient-to-r ${sectionRule}`} />
          </div>
          <Link
            href={`/groups/${group.id}/members`}
            className={`text-xs ${linkCls} font-medium hover:underline`}
          >
            Manage →
          </Link>
        </div>

        <CircleContributionRoster
          members={dash.memberStatuses}
          isAdmin={isAdmin}
          currentMemberId={dash.currentMemberId}
          amount={amount}
          currency={group.defaultCurrency}
          period={isRecurring ? dash.selectedPeriod : null}
          periodLabel={isRecurring ? dash.selectedPeriodLabel : null}
          groupId={group.id}
          isOneTime={isOneTime}
          hideAmounts={hideAmounts}
        />
      </div>

      {/* ── Send reminder (admin, when truly-unpaid members exist) ─────── */}
      {/* BUG-08 fix: use unpaidCount (not pendingCount) so the reminder button
          is hidden when every unconfirmed member has already self-reported. */}
      {isAdmin && dash.unpaidCount > 0 && (
        <CircleReminderButton
          groupId={group.id}
          groupName={group.name}
          circleName={group.name}
          periodLabel={isRecurring ? dash.selectedPeriodLabel : null}
          paidCount={dash.paidCount}
          totalCount={dash.memberStatuses.length}
          pendingMembers={pendingMembers}
          amount={amount}
          currency={group.defaultCurrency}
          upiId={group.upiId ?? null}
          joinUrl={joinUrl}
          circlePeriod={isRecurring ? dash.selectedPeriod : null}
          isOneTime={isOneTime}
        />
      )}

      {/* ── One-time lifecycle status (one-time mode only) ───────────────── */}
      {isOneTime && (
        <CircleGoalStatus
          groupId={group.id}
          status={group.circleStatus}
          isAdmin={isAdmin}
          poolBalance={dash.poolBalance}
          allTimeExpenses={dash.allTimeExpenses}
          allTimeCollected={dash.allTimeCollected}
          targetAmount={targetNum}
          currency={group.defaultCurrency}
        />
      )}

      {/* ── Wallet expenses ──────────────────────────────────────────────── */}
      {group.walletExpensesEnabled ? (
        <div className="glass rounded-2xl p-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-6 h-6 rounded-md ${sectionBg} flex items-center justify-center shrink-0`}>
                <Receipt className={`w-3.5 h-3.5 ${sectionIcon}`} />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Wallet expenses</span>
              <div className={`flex-1 h-[1.5px] w-12 bg-gradient-to-r ${sectionRule}`} />
            </div>
            <Link
              href={`/groups/${group.id}/expenses`}
              className={`text-xs ${linkCls} font-medium hover:underline`}
            >
              View all →
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {formatCurrency(dash.allTimeExpenses, group.defaultCurrency)} drawn from wallet
          </p>

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

          {isAdmin && (
            <Link
              href={`/groups/${group.id}/expenses/new`}
              className={`mt-4 w-full inline-flex items-center justify-center gap-1.5
                         bg-gradient-to-br ${theme.gradient} hover:brightness-105 ${theme.glow}
                         text-white text-sm font-medium rounded-xl px-4 py-2.5
                         shadow-sm transition-all`}
            >
              <Plus className="w-4 h-4" />
              Log wallet expense
            </Link>
          )}
        </div>
      ) : (
        /* Expenses disabled — quiet one-liner for admin, nothing for members */
        isAdmin && (
          <div className="mt-6 flex items-center justify-between px-1">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Expense tracking is off for this circle
            </p>
            <Link
              href={`/groups/${group.id}/edit`}
              className={`text-xs ${linkCls} font-medium hover:underline`}
            >
              Enable →
            </Link>
          </div>
        )
      )}

      {/* ── Members ──────────────────────────────────────────────────────────
          Shows who's in the circle, flags unjoined ghosts, and gives admins
          a direct path to add more people.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mt-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-6 h-6 rounded-md ${sectionBg} flex items-center justify-center shrink-0`}>
              <Users className={`w-3.5 h-3.5 ${sectionIcon}`} />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
            <div className={`flex-1 h-[1.5px] w-12 bg-gradient-to-r ${sectionRule}`} />
          </div>
          {isAdmin && (
            <Link
              href={`/groups/${group.id}/members`}
              className={`inline-flex items-center gap-1 text-xs ${linkCls} font-medium hover:opacity-80 transition-opacity`}
            >
              <Plus className="w-3 h-3" />
              Add / Manage
            </Link>
          )}
        </div>

        {/* Avatar row — up to 8 initials, then overflow count */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {members.slice(0, 8).map((m) => {
            const name    = m.displayName ?? m.guestName ?? "?";
            const isGhost = !!m.guestName && !m.userId;
            return (
              <div
                key={m.id}
                title={name}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  isGhost
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-dashed ring-slate-300 dark:ring-slate-600"
                    : `${sectionBg} ${linkCls}`
                }`}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            );
          })}
          {members.length > 8 && (
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400">
              +{members.length - 8}
            </div>
          )}
        </div>

        {/* Ghost count notice — shown only when some members haven't joined */}
        {(() => {
          const ghostCount = members.filter((m) => !!m.guestName && !m.userId).length;
          return ghostCount > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {ghostCount === 1
                ? "1 member hasn't joined ClearOff yet"
                : `${ghostCount} members haven't joined ClearOff yet`}
            </p>
          ) : null;
        })()}

        {/* Full-width link button */}
        <Link
          href={`/groups/${group.id}/members`}
          className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border ${theme.softBorder} text-sm font-medium ${linkCls} ${theme.tint} hover:brightness-95 dark:hover:brightness-110 transition-all`}
        >
          <Users className="w-4 h-4" />
          Members
        </Link>
      </div>
    </div>
  );
}
