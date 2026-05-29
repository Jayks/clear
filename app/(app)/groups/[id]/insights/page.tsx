import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/shared/skeleton";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getGroupExpensesWithSplits } from "@/lib/db/queries/expenses";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { computeTripInsights } from "@/lib/insights/trip-insights";
import { computeGroupRoles } from "@/lib/insights/group-roles";
import { computeSpendTrajectory } from "@/lib/insights/cross-trip";
import { CrossTripSection } from "./cross-trip-section";
import { KpiCard } from "@/components/insights/kpi-card";
import { GroupRolesCard } from "@/components/insights/group-roles-card";
import { PaceTrackerCard } from "@/components/insights/pace-tracker-card";
import { HighlightsStrip } from "@/components/insights/highlights-strip";
import { NestPaceCard, computeNestPaceData } from "@/components/insights/nest-pace-card";
import { AnimatedList } from "@/components/shared/animated-list";
import { FadeIn } from "@/components/shared/fade-in";
import { CategoryDonut } from "@/components/insights/category-donut";
import { DailySpendBar } from "@/components/insights/daily-spend-bar";
import { MonthlySpendBar } from "@/components/insights/monthly-spend-bar";
import type { MonthSpend } from "@/components/insights/monthly-spend-bar";
import { MemberContributions } from "@/components/insights/member-contributions";
import { AdherenceCard } from "@/components/trip/adherence-card";
import { ArrowLeft, BarChart2, PieChart, Users, Share2 } from "lucide-react";

export default async function GroupInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [tripData, expensesWithSplits, currentUser] = await Promise.all([
    getGroupWithMembers(id, { full: true }),
    getGroupExpensesWithSplits(id),
    getCurrentUser(),
  ]);
  if (!tripData) notFound();

  const { group, members } = tripData;
  const isNest = group.groupType === "nest";
  const currency = group.defaultCurrency;

  const insights = computeTripInsights({ trip: group, members, expensesWithSplits });
  const groupRoles = computeGroupRoles({ members, expensesWithSplits });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  // ── Current user's member record ─────────────────────────────────────────
  const currentMember = currentUser
    ? members.find((m) => m.userId === currentUser.id) ?? null
    : null;

  // Current user's paid / owed / net from byMember
  const currentMemberRow = currentMember
    ? insights.byMember.find((r) => r.memberId === currentMember.id) ?? null
    : null;
  const currentUserNet = currentMemberRow ? currentMemberRow.net : null;

  // ── Nest monthly data ─────────────────────────────────────────────────────
  const monthlyData: MonthSpend[] = [];
  if (isNest && expensesWithSplits.length > 0) {
    const monthMap = new Map<string, { amount: number; recurring: number; adhoc: number }>();
    for (const { expense } of expensesWithSplits) {
      const key = expense.expenseDate.slice(0, 7);
      const existing = monthMap.get(key) ?? { amount: 0, recurring: 0, adhoc: 0 };
      const amt = Number(expense.amount);
      const isRecurring = !!expense.sourceTemplateId;
      monthMap.set(key, {
        amount: existing.amount + amt,
        recurring: existing.recurring + (isRecurring ? amt : 0),
        adhoc: existing.adhoc + (!isRecurring ? amt : 0),
      });
    }
    const sorted = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, val] of sorted) {
      const [year, month] = key.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      const label = date.toLocaleString("en-IN", { month: "short" }) + " '" + String(year).slice(2);
      monthlyData.push({ label, month: key, ...val });
    }
  }

  // ── Nest KPI values ───────────────────────────────────────────────────────
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const thisMonth = monthlyData.find((m) => m.month === thisMonthKey);
  const lastMonth = monthlyData.find((m) => m.month === lastMonthKey);

  // MoM % change
  const momPct =
    lastMonth && lastMonth.amount > 0 && thisMonth
      ? Math.round(((thisMonth.amount - lastMonth.amount) / lastMonth.amount) * 100)
      : null;
  const momLabel =
    momPct !== null
      ? `${momPct >= 0 ? "+" : ""}${momPct}% vs ${lastMonthDate.toLocaleString("en-IN", { month: "short" })}`
      : undefined;

  // Per person this month
  const perPersonThisMonth =
    thisMonth && members.length > 0
      ? Math.round(thisMonth.amount / members.length)
      : null;

  // Recurring this month
  const recurringThisMonth = thisMonth?.recurring ?? 0;
  const recurringPctThisMonth =
    thisMonth && thisMonth.amount > 0
      ? Math.round((recurringThisMonth / thisMonth.amount) * 100)
      : 0;

  // ── Nest pace ─────────────────────────────────────────────────────────────
  const nestPaceData = isNest && thisMonth
    ? computeNestPaceData({
        thisMonthSpend: thisMonth.amount,
        monthlyHistory: monthlyData.filter((m) => m.month !== thisMonthKey),
        thisMonthKey,
        monthLabel: (() => {
          const [y, mo] = thisMonthKey.split("-");
          const d = new Date(Number(y), Number(mo) - 1, 1);
          return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
        })(),
      })
    : null;

  // ── Trip KPI 4: contextual ─────────────────────────────────────────────────
  const hasBudget = !isNest && group.budget != null && Number(group.budget) > 0;
  const budgetUsedPct = hasBudget
    ? Math.round((insights.totalSpend / Number(group.budget)) * 100)
    : null;

  // ── Trip trajectory ────────────────────────────────────────────────────────
  const trajectory = !isNest
    ? computeSpendTrajectory({
        totalSpend: insights.totalSpend,
        startDate: group.startDate,
        endDate: group.endDate,
        budget: group.budget ? Number(group.budget) : null,
      })
    : null;

  const perPersonDaily =
    !isNest && insights.tripDays > 0
      ? Math.round(insights.perPerson / insights.tripDays)
      : 0;

  // ── Trip state (active / completed / future / undated) ────────────────────
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  type TripState = "active" | "completed" | "future" | "undated";
  const tripState: TripState = isNest ? "undated"
    : !group.startDate ? "undated"
    : group.startDate > todayStr ? "future"
    : !group.endDate || group.endDate >= todayStr ? "active"
    : "completed";

  const daysUntilStart = tripState === "future" && group.startDate
    ? Math.max(0, Math.ceil(
        (new Date(group.startDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      ))
    : 0;

  // ── Fair share per person for MemberContributions reference line ──────────
  const fairShare = members.length > 0 ? Math.round(insights.totalSpend / members.length) : null;

  // ── Monthly average for MonthlySpendBar reference line ────────────────────
  const nestMonthlyAverage = isNest && monthlyData.length > 0
    ? Math.round(insights.totalSpend / monthlyData.length)
    : undefined;

  // ── Opening sentence — rule-based narrative summary ────────────────────────
  const topCat = insights.topCategory;
  let openingSentence: string | null = null;
  if (insights.totalSpend > 0 && topCat) {
    if (!isNest) {
      if (tripState === "active") {
        // Days elapsed = byDay entries (already truncated to today)
        const daysIn = insights.byDay.length;
        openingSentence = `Day ${daysIn} of ${insights.tripDays} · ${topCat.label} leading at ${topCat.percentage}% · ${fmt(insights.dailyAverage)}/day so far`;
      } else if (tripState === "completed") {
        openingSentence = `${topCat.label} dominated at ${topCat.percentage}%`;
        if (trajectory?.projectedOverage !== undefined && trajectory.projectedOverage !== null && trajectory.budget !== null) {
          const over = trajectory.projectedOverage;
          openingSentence += over <= 0
            ? ` · came in ${fmt(Math.abs(over))} under budget 🎉`
            : ` · went ${fmt(over)} over budget`;
        }
      } else if (tripState === "future") {
        const parts: string[] = [];
        if (insights.totalSpend > 0) parts.push(`${fmt(insights.totalSpend)} pre-booked`);
        if (hasBudget) parts.push(`${fmt(Number(group.budget))} budget`);
        parts.push(`starts in ${daysUntilStart} day${daysUntilStart !== 1 ? "s" : ""}`);
        openingSentence = parts.join(" · ");
      }
    } else if (thisMonth) {
      const parts = [`${fmt(thisMonth.amount)} this month`, `${topCat.label} at ${topCat.percentage}%`];
      if (momLabel) parts.push(momLabel);
      openingSentence = parts.join(" · ");
    }
  }

  // ── Page header meta ───────────────────────────────────────────────────────
  let metaLine: string;
  if (isNest) {
    const ml = thisMonth
      ? (() => {
          const [y, mo] = thisMonthKey.split("-");
          return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
        })()
      : null;
    metaLine = [
      ml ? `${ml}` : null,
      thisMonth ? fmt(thisMonth.amount) : null,
      `${members.length} member${members.length !== 1 ? "s" : ""}`,
      monthlyData.length > 1 ? `${monthlyData.length} months` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  } else {
    const budgetStatus =
      budgetUsedPct !== null
        ? budgetUsedPct <= 100
          ? `${100 - budgetUsedPct}% under budget`
          : `${budgetUsedPct - 100}% over budget`
        : null;
    metaLine = [
      insights.tripDays > 1 ? `${insights.tripDays} days` : null,
      fmt(insights.totalSpend),
      `${members.length} people`,
      budgetStatus,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (expensesWithSplits.length === 0) {
    return (
      <div>
        <Link
          href={`/groups/${id}`}
          className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/25">
            <BarChart2 className="w-7 h-7 text-white" />
          </div>
          <h2
            className="text-lg text-slate-800 dark:text-slate-100 mb-1"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            No expenses yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Add some expenses and come back for insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page header (desktop only) ───────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <Link
          href={`/groups/${id}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-sm shadow-amber-500/30 shrink-0">
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1
            className="text-2xl text-slate-800 dark:text-slate-100"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Insights
          </h1>
          {metaLine && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{metaLine}</p>
          )}
        </div>
        {/* Share trip summary link — trips only, desktop header */}
        {!isNest && group.shareToken && (
          <Link
            href={`/summary/${group.shareToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 min-h-[44px] text-xs text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share summary
          </Link>
        )}
      </div>

      {/* ── Mobile context: meta-line above KPIs (header is desktop-only) ── */}
      {metaLine && (
        <p className="md:hidden text-xs text-slate-500 dark:text-slate-400 mb-3 -mt-1">
          {metaLine}
        </p>
      )}

      {/* ── Opening sentence — narrative chapter heading ──────────────────── */}
      {openingSentence && (
        <FadeIn>
          <div className="relative glass rounded-xl px-4 py-3 mb-5 overflow-hidden">
            {/* Amber left-edge accent */}
            <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-amber-400 to-orange-400" />
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3">
              {openingSentence}
            </p>
          </div>
        </FadeIn>
      )}

      {/* ── Active trip: Pace Tracker BEFORE KPIs — it's the hero on a live trip ── */}
      {!isNest && tripState === "active" && trajectory && (
        <FadeIn>
          <PaceTrackerCard data={trajectory} currency={currency} groupId={id} />
        </FadeIn>
      )}

      {/* ── Future trip: T-minus badge before KPIs ──────────────────────── */}
      {!isNest && tripState === "future" && (
        <FadeIn>
          <div className="glass rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-xl shrink-0">🗓️</span>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {daysUntilStart === 0 ? "Starts today!" : `Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? "s" : ""}`}
              </p>
              {hasBudget && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Budget: {fmt(Number(group.budget))}
                </p>
              )}
            </div>
          </div>
        </FadeIn>
      )}

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <AnimatedList className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" staggerMs={80} data-tour="trip-kpis">
        {isNest ? [
          /* Nest KPI 1: This month — accent, with MoM sub */
          <KpiCard
            key="this"
            label="This month"
            value={fmt(thisMonth?.amount ?? 0)}
            numericValue={thisMonth?.amount ?? 0}
            currency={currency}
            accent
            sub={momLabel}
          />,

          /* Nest KPI 2: Per person this month */
          <KpiCard
            key="pp"
            label="Per person"
            value={perPersonThisMonth !== null ? fmt(perPersonThisMonth) : "—"}
            numericValue={perPersonThisMonth ?? undefined}
            currency={currency}
            sub="this month"
          />,

          /* Nest KPI 3: Recurring this month */
          <KpiCard
            key="rec"
            label="Recurring"
            value={fmt(recurringThisMonth)}
            numericValue={recurringThisMonth}
            currency={currency}
            sub={recurringPctThisMonth > 0 ? `${recurringPctThisMonth}% of total` : "none this month"}
          />,

          /* Nest KPI 4: All time */
          <KpiCard
            key="all"
            label="All time"
            value={fmt(insights.totalSpend)}
            numericValue={insights.totalSpend}
            currency={currency}
            sub={`${insights.expenseCount} expenses`}
          />,
        ] : [
          /* Trip KPI 1: Total spend — accent */
          <KpiCard
            key="total"
            label="Total spend"
            value={fmt(insights.totalSpend)}
            numericValue={insights.totalSpend}
            currency={currency}
            accent
          />,

          /* Trip KPI 2: Per person */
          <KpiCard
            key="pp"
            label="Per person"
            value={fmt(insights.perPerson)}
            numericValue={insights.perPerson}
            currency={currency}
          />,

          /* Trip KPI 3: Daily average */
          <KpiCard
            key="daily"
            label="Daily average"
            value={fmt(insights.dailyAverage)}
            numericValue={insights.dailyAverage}
            currency={currency}
          />,

          /* Trip KPI 4: contextual — budget% if budget set, else your position */
          hasBudget && budgetUsedPct !== null ? (
            <KpiCard
              key="budget"
              label="Budget used"
              value={`${budgetUsedPct}%`}
              numericValue={budgetUsedPct}
              sub={`of ${fmt(Number(group.budget))}`}
            />
          ) : currentUserNet !== null ? (
            <Link
              key="yourpos"
              href={`/groups/${id}/settle`}
              className="block h-full rounded-xl ring-1 ring-transparent hover:ring-cyan-500/40 dark:hover:ring-cyan-500/30 transition-shadow"
            >
              <KpiCard
                label="Your position"
                value={currentUserNet >= 0 ? `+${fmt(currentUserNet)}` : fmt(currentUserNet)}
                numericValue={Math.abs(currentUserNet)}
                currency={currency}
                sub={`${currentUserNet >= 0 ? "you're owed" : "you owe"} · settle →`}
              />
            </Link>
          ) : (
            <KpiCard
              key="count"
              label="Expenses"
              value={String(insights.expenseCount)}
              numericValue={insights.expenseCount}
              sub={`over ${insights.tripDays} day${insights.tripDays > 1 ? "s" : ""}`}
            />
          ),
        ]}
      </AnimatedList>

      {/* ── Highlights Strip ──────────────────────────────────────────────── */}
      {insights.highlights.length > 0 && (
        <FadeIn className="mb-6">
          <HighlightsStrip highlights={insights.highlights} />
        </FadeIn>
      )}

      {/* ── Pace Tracker (trip) — active trips already rendered ABOVE KPIs ── */}
      {!isNest && trajectory && tripState !== "active" && (
        <FadeIn>
          <PaceTrackerCard data={trajectory} currency={currency} groupId={id} />
        </FadeIn>
      )}

      {/* ── Nest Pace Card ────────────────────────────────────────────────── */}
      {isNest && nestPaceData && (
        <FadeIn>
          <NestPaceCard data={nestPaceData} currency={currency} groupId={id} />
        </FadeIn>
      )}

      {/* ── Breakdown charts ─────────────────────────────────────────────── */}
      <FadeIn>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <PieChart className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Breakdown</span>
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/70 to-transparent dark:from-amber-800/40 dark:to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6" data-tour="insights-charts">
          <CategoryDonut data={insights.byCategory} currency={currency} />
          {isNest
            ? <MonthlySpendBar data={monthlyData} currency={currency} monthlyAverage={nestMonthlyAverage} />
            : <DailySpendBar data={insights.byDay} currency={currency} />
          }
          <MemberContributions
            data={insights.byMember}
            currency={currency}
            currentMemberId={currentMember?.id}
            currentUserNet={currentUserNet ?? undefined}
            settleHref={`/groups/${id}/settle`}
            fairShare={fairShare ?? undefined}
          />
        </div>
      </FadeIn>

      {/* ── Group Dynamics — only meaningful with 2+ members ────────────── */}
      {members.length >= 2 && (
        <FadeIn className="mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Group dynamics</span>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/70 to-transparent dark:from-amber-800/40 dark:to-transparent" />
          </div>
          <GroupRolesCard data={groupRoles} />
        </FadeIn>
      )}

      {/* ── Cross-trip comparison (trip only) — section header lives inside CrossTripSection
           so it only renders when there are actual comparisons to show */}
      {!isNest && (
        <FadeIn className="mb-6">
          <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
            <CrossTripSection
              groupId={id}
              totalSpend={insights.totalSpend}
              memberCount={members.length}
              tripDays={insights.tripDays}
              currency={currency}
              topCategory={insights.topCategory?.category ?? null}
              topCategoryPct={insights.topCategory?.percentage ?? 0}
              perPersonDaily={perPersonDaily}
            />
          </Suspense>
        </FadeIn>
      )}

      {/* ── Plan vs Reality (trip only, if itinerary exists) ─────────────── */}
      {!isNest && group.itinerary && (
        <FadeIn className="mb-6">
          <AdherenceCard
            itinerary={group.itinerary}
            expenses={expensesWithSplits.map(({ expense }) => ({
              description: expense.description,
              expenseDate: expense.expenseDate,
            }))}
          />
        </FadeIn>
      )}
    </div>
  );
}
