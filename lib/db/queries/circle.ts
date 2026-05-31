import { db } from "@/lib/db/client";
import { circleContributions } from "@/lib/db/schema/circle-contributions";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { eq, and, sql, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/db/queries/auth";

// ── Shared helpers ────────────────────────────────────────────────────────────

function nowPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period: string): string {
  const [y, m] = period.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function addMonths(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface PendingMember {
  id:      string;
  name:    string;
  isGuest: boolean;
}

export interface CircleCardData {
  totalMembers:      number;
  paidThisCycle:     number;
  totalContributed:  number;
  poolBalance:       number;
  currentMemberId:   string | null;
  isAdmin:           boolean;
  currentUserPaid:   boolean;
  pendingMembers:    PendingMember[];
  currentPeriod:     string;   // "2026-06"
  currentPeriodLabel: string;  // "June 2026"
}

/**
 * Fetches all data needed to render a CircleCard on the home page.
 * Called from the CircleCardServer RSC (one call per circle, Suspense-streamed).
 */
export async function getCircleCardData(
  groupId: string,
  circleMode: string | null,
): Promise<CircleCardData> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentPeriodLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const [allMembers, cycleContribs, expenseRows] = await Promise.all([
    // All group members
    db
      .select({
        id:          groupMembers.id,
        userId:      groupMembers.userId,
        displayName: groupMembers.displayName,
        guestName:   groupMembers.guestName,
        role:        groupMembers.role,
      })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId)),

    // Recurring → filter by current month period.
    // Goal → all contributions (period is null for goal mode).
    db
      .select({ memberId: circleContributions.memberId, amount: circleContributions.amount })
      .from(circleContributions)
      .where(
        circleMode === "recurring"
          ? and(
              eq(circleContributions.groupId, groupId),
              eq(circleContributions.period, currentPeriod),
            )
          : eq(circleContributions.groupId, groupId),
      ),

    // Pool draws: all non-template expenses against this group
    db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false))),
  ]);

  const paidMemberIds   = new Set(cycleContribs.map((c) => c.memberId));
  const totalContributed = cycleContribs.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalExpenses    = Number(expenseRows[0]?.total ?? 0);

  const currentMember   = allMembers.find((m) => m.userId === user.id);
  const currentMemberId = currentMember?.id ?? null;
  const isAdmin         = currentMember?.role === "admin";
  const currentUserPaid = currentMemberId ? paidMemberIds.has(currentMemberId) : false;

  const pendingMembers: PendingMember[] = allMembers
    .filter((m) => !paidMemberIds.has(m.id))
    .map((m) => ({
      id:      m.id,
      name:    m.displayName ?? m.guestName ?? "Member",
      isGuest: !m.userId,
    }));

  return {
    totalMembers:       allMembers.length,
    paidThisCycle:      paidMemberIds.size,
    totalContributed,
    poolBalance:        totalContributed - totalExpenses,
    currentMemberId,
    isAdmin,
    currentUserPaid,
    pendingMembers,
    currentPeriod,
    currentPeriodLabel,
  };
}

// ── Dashboard data ────────────────────────────────────────────────────────────

export interface MemberDashboardStatus {
  id:                 string;
  name:               string;
  isGuest:            boolean;
  role:               "admin" | "member";
  userId:             string | null;
  isPaid:             boolean;
  contributionDate:   string | null;  // ISO date of this cycle's payment
  contributionAmount: number | null;
}

export interface RecentPoolExpense {
  id:          string;
  description: string;
  category:    string;
  amount:      number;
  expenseDate: string;
  isAdvance:   boolean;
  paidByName:  string;
}

export interface CircleDashboardData {
  // Period navigation (recurring only)
  selectedPeriod:      string;        // "2026-06"
  selectedPeriodLabel: string;        // "June 2026"
  prevPeriod:          string;        // "2026-05"
  nextPeriod:          string;        // "2026-07"
  isCurrentPeriod:     boolean;

  // Members and their status for the selected period
  memberStatuses: MemberDashboardStatus[];
  paidCount:      number;
  pendingCount:   number;

  // This cycle's collection
  cycleCollected: number;             // SUM of contributions this period

  // All-time pool financials
  allTimeCollected: number;
  allTimeExpenses:  number;
  poolBalance:      number;

  // Health indicator (recurring only, when contributionAmount is set)
  // runwayMonths = pool_balance / (contributionAmount * totalMembers)
  runwayMonths: number | null;

  // Current user
  isAdmin:               boolean;
  currentMemberId:       string | null;
  currentUserPaid:       boolean;
  myContributionDate:    string | null;
  myContributionAmount:  number | null;

  // Recent pool expenses (last 3, for dashboard inline list)
  recentExpenses: RecentPoolExpense[];
}

/**
 * Full data for the Circle dashboard page.
 * `selectedPeriod` = "YYYY-MM" (recurring) or null (goal — fetches all contributions).
 */
export async function getCircleDashboardData(
  groupId: string,
  circleMode: string | null,
  selectedPeriod: string | null,
  contributionAmount: number | null,
): Promise<CircleDashboardData> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const current       = nowPeriod();
  const period        = selectedPeriod ?? current;
  const periodLbl     = periodLabel(period);
  const prev          = addMonths(period, -1);
  const next          = addMonths(period, 1);
  const isCurrentPer  = period === current;
  const isRecurring   = circleMode === "recurring";

  const [allMembers, cycleContribs, allTimeRows, expenseRows, recentExpenseRows] = await Promise.all([
    // All group members
    db.select({
      id:          groupMembers.id,
      userId:      groupMembers.userId,
      displayName: groupMembers.displayName,
      guestName:   groupMembers.guestName,
      role:        groupMembers.role,
    }).from(groupMembers).where(eq(groupMembers.groupId, groupId)),

    // Contributions for the selected period (recurring) or all (goal)
    db.select({
      memberId:  circleContributions.memberId,
      amount:    circleContributions.amount,
      createdAt: circleContributions.createdAt,
    }).from(circleContributions).where(
      isRecurring
        ? and(eq(circleContributions.groupId, groupId), eq(circleContributions.period, period))
        : eq(circleContributions.groupId, groupId),
    ),

    // All-time contribution total
    db.select({ total: sql<string>`COALESCE(SUM(${circleContributions.amount}), 0)` })
      .from(circleContributions)
      .where(eq(circleContributions.groupId, groupId)),

    // All-time expense total (pool draws)
    db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false))),

    // Recent pool expenses (last 3) with payer info
    db.select({
      id:             expenses.id,
      description:    expenses.description,
      category:       expenses.category,
      amount:         expenses.amount,
      expenseDate:    expenses.expenseDate,
      isAdvance:      expenses.isAdvance,
      paidByMemberId: expenses.paidByMemberId,
      payerDisplay:   groupMembers.displayName,
      payerGuest:     groupMembers.guestName,
    }).from(expenses)
      .leftJoin(groupMembers, eq(expenses.paidByMemberId, groupMembers.id))
      .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false)))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      .limit(3),
  ]);

  const paidMap = new Map(cycleContribs.map((c) => [c.memberId, c]));
  const allTimeCollected = Number(allTimeRows[0]?.total ?? 0);
  const allTimeExpenses  = Number(expenseRows[0]?.total ?? 0);
  const poolBalance      = allTimeCollected - allTimeExpenses;

  const currentMember   = allMembers.find((m) => m.userId === user.id);
  const currentMemberId = currentMember?.id ?? null;
  const isAdmin         = currentMember?.role === "admin";

  const myContrib = currentMemberId ? paidMap.get(currentMemberId) : undefined;

  const memberStatuses: MemberDashboardStatus[] = allMembers.map((m) => {
    const contrib = paidMap.get(m.id);
    return {
      id:                 m.id,
      name:               m.displayName ?? m.guestName ?? "Member",
      isGuest:            !m.userId,
      role:               m.role,
      userId:             m.userId ?? null,
      isPaid:             paidMap.has(m.id),
      contributionDate:   contrib?.createdAt
        ? new Date(contrib.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : null,
      contributionAmount: contrib ? Number(contrib.amount) : null,
    };
  });

  const paidCount    = [...paidMap.keys()].length;
  const pendingCount = allMembers.length - paidCount;
  const cycleCollected = cycleContribs.reduce((s, c) => s + Number(c.amount), 0);

  // Runway: how many months of collection would the pool sustain at zero inflow
  // Only meaningful when there are expenses (there's actually a drain).
  // runwayMonths = pool_balance / (contributionAmount * totalMembers)
  const monthlyCommitted = contributionAmount != null ? contributionAmount * allMembers.length : null;
  const runwayMonths = monthlyCommitted && monthlyCommitted > 0
    ? Math.round((poolBalance / monthlyCommitted) * 10) / 10
    : null;

  const recentExpenses: RecentPoolExpense[] = recentExpenseRows.map((r) => ({
    id:          r.id,
    description: r.description,
    category:    r.category,
    amount:      Number(r.amount),
    expenseDate: r.expenseDate,
    isAdvance:   r.isAdvance,
    paidByName:  r.payerDisplay ?? r.payerGuest ?? "Admin",
  }));

  return {
    selectedPeriod:      period,
    selectedPeriodLabel: periodLbl,
    prevPeriod:          prev,
    nextPeriod:          next,
    isCurrentPeriod:     isCurrentPer,
    memberStatuses,
    paidCount,
    pendingCount,
    cycleCollected,
    allTimeCollected,
    allTimeExpenses,
    poolBalance,
    runwayMonths,
    isAdmin,
    currentMemberId,
    currentUserPaid:      currentMemberId ? paidMap.has(currentMemberId) : false,
    myContributionDate:   myContrib?.createdAt
      ? new Date(myContrib.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : null,
    myContributionAmount: myContrib ? Number(myContrib.amount) : null,
    recentExpenses,
  };
}
