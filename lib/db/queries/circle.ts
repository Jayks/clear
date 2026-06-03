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
  totalMembers:              number;
  paidThisCycle:             number;
  totalContributed:          number;
  poolBalance:               number;
  currentMemberId:           string | null;
  isAdmin:                   boolean;
  currentUserPaid:           boolean;
  currentUserPendingConfirm: boolean;   // member self-reported, awaiting admin confirmation
  pendingMembers:            PendingMember[];
  paidMembers:               PendingMember[];  // one-time mode: admin can record additional contributions
  pendingConfirmCount:       number;    // admin: how many unconfirmed self-reports
  currentPeriod:             string;   // "2026-06"
  currentPeriodLabel:        string;  // "June 2026"
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

    // Only confirmed contributions count toward totals and "paid" state.
    // Unconfirmed self-reports are tracked separately for the pending-confirm state.
    db
      .select({ memberId: circleContributions.memberId, amount: circleContributions.amount, isConfirmed: circleContributions.isConfirmed })
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

  // Separate confirmed from unconfirmed self-reports
  const confirmedContribs   = cycleContribs.filter((c) => c.isConfirmed);
  const unconfirmedContribs = cycleContribs.filter((c) => !c.isConfirmed);

  const paidMemberIds          = new Set(confirmedContribs.map((c) => c.memberId));
  const pendingConfirmMemberIds = new Set(unconfirmedContribs.map((c) => c.memberId));

  // Only confirmed contributions count toward pool balance
  const totalContributed = confirmedContribs.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalExpenses    = Number(expenseRows[0]?.total ?? 0);

  const currentMember   = allMembers.find((m) => m.userId === user.id);
  const currentMemberId = currentMember?.id ?? null;
  const isAdmin         = currentMember?.role === "admin";
  const currentUserPaid             = currentMemberId ? paidMemberIds.has(currentMemberId) : false;
  const currentUserPendingConfirm   = currentMemberId ? pendingConfirmMemberIds.has(currentMemberId) : false;

  // Admin sees chips for all unpaid members (both ⏳ and 🟡)
  const pendingMembers: PendingMember[] = allMembers
    .filter((m) => !paidMemberIds.has(m.id))
    .map((m) => ({
      id:      m.id,
      name:    m.displayName ?? m.guestName ?? "Member",
      isGuest: !m.userId,
    }));

  // Goal mode: paid members can receive additional contributions
  const paidMembers: PendingMember[] = allMembers
    .filter((m) => paidMemberIds.has(m.id))
    .map((m) => ({
      id:      m.id,
      name:    m.displayName ?? m.guestName ?? "Member",
      isGuest: !m.userId,
    }));

  return {
    totalMembers:              allMembers.length,
    paidThisCycle:             paidMemberIds.size,
    totalContributed,
    poolBalance:               totalContributed - totalExpenses,
    currentMemberId,
    isAdmin,
    currentUserPaid,
    currentUserPendingConfirm,
    pendingMembers,
    paidMembers,
    pendingConfirmCount:       unconfirmedContribs.length,
    currentPeriod,
    currentPeriodLabel,
  };
}

// ── Dashboard data ────────────────────────────────────────────────────────────

export interface MemberDashboardStatus {
  id:                        string;
  name:                      string;
  isGuest:                   boolean;
  role:                      "admin" | "member";
  userId:                    string | null;
  isPaid:                    boolean;
  isPendingConfirm:          boolean;    // self-reported, awaiting admin confirmation
  unconfirmedContributionId: string | null; // used by admin to confirm/reject
  pendingAmount:             number | null; // amount of the pending self-report
  pendingPaymentMethod:      string | null; // payment method of the self-report ('upi'|'cash'|etc)
  pendingUtrReference:       string | null; // UTR from the self-report
  contributionDate:          string | null;
  contributionAmount:        number | null;
  /** Payment method of the confirmed contribution — e.g. 'upi' | 'cash' | null */
  paidPaymentMethod:         string | null;
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

  // Batch confirm — members with unconfirmed self-reports
  pendingConfirmMembers: { memberId: string; name: string; contributionId: string; amount: number }[];
}

/**
 * Full data for the Circle dashboard page.
 * `selectedPeriod` = "YYYY-MM" (recurring) or null (one_time — fetches all contributions).
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
      id:            circleContributions.id,
      memberId:      circleContributions.memberId,
      amount:        circleContributions.amount,
      createdAt:     circleContributions.createdAt,
      isConfirmed:   circleContributions.isConfirmed,
      paymentMethod: circleContributions.paymentMethod,
      utrReference:  circleContributions.utrReference,
    }).from(circleContributions).where(
      isRecurring
        ? and(eq(circleContributions.groupId, groupId), eq(circleContributions.period, period))
        : eq(circleContributions.groupId, groupId),
    ),

    // All-time confirmed contribution total (unconfirmed self-reports excluded)
    db.select({ total: sql<string>`COALESCE(SUM(${circleContributions.amount}), 0)` })
      .from(circleContributions)
      .where(and(eq(circleContributions.groupId, groupId), eq(circleContributions.isConfirmed, true))),

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

  // Split confirmed vs unconfirmed contributions
  const confirmedMap   = new Map(cycleContribs.filter((c) => c.isConfirmed).map((c) => [c.memberId, c]));
  const unconfirmedMap = new Map(cycleContribs.filter((c) => !c.isConfirmed).map((c) => [c.memberId, c]));

  // Only confirmed contributions count toward pool balance and cycle totals
  const allTimeCollected = Number(allTimeRows[0]?.total ?? 0);
  const allTimeExpenses  = Number(expenseRows[0]?.total ?? 0);
  const poolBalance      = allTimeCollected - allTimeExpenses;

  const currentMember   = allMembers.find((m) => m.userId === user.id);
  const currentMemberId = currentMember?.id ?? null;
  const isAdmin         = currentMember?.role === "admin";

  const myContrib = currentMemberId ? confirmedMap.get(currentMemberId) : undefined;

  const memberStatuses: MemberDashboardStatus[] = allMembers.map((m) => {
    const confirmed   = confirmedMap.get(m.id);
    const unconfirmed = unconfirmedMap.get(m.id);
    return {
      id:                        m.id,
      name:                      m.displayName ?? m.guestName ?? "Member",
      isGuest:                   !m.userId,
      role:                      m.role,
      userId:                    m.userId ?? null,
      isPaid:                    confirmedMap.has(m.id),
      isPendingConfirm:          unconfirmedMap.has(m.id),
      unconfirmedContributionId: unconfirmed?.id ?? null,
      pendingAmount:             unconfirmed ? Number(unconfirmed.amount) : null,
      pendingPaymentMethod:      unconfirmed?.paymentMethod ?? null,
      pendingUtrReference:       unconfirmed?.utrReference ?? null,
      contributionDate:          confirmed?.createdAt
        ? new Date(confirmed.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : null,
      contributionAmount:        confirmed ? Number(confirmed.amount) : null,
      paidPaymentMethod:         confirmed?.paymentMethod ?? null,
    };
  });

  const paidCount    = confirmedMap.size;
  const pendingCount = allMembers.length - paidCount;
  // Cycle collected = confirmed only (unconfirmed don't count until admin confirms)
  const cycleCollected = [...confirmedMap.values()].reduce((s, c) => s + Number(c.amount), 0);

  // Members with unconfirmed self-reports — for batch confirm banner
  const pendingConfirmMembers = allMembers
    .filter((m) => unconfirmedMap.has(m.id))
    .map((m) => {
      const uc = unconfirmedMap.get(m.id)!;
      return {
        memberId:       m.id,
        name:           m.displayName ?? m.guestName ?? "Member",
        contributionId: uc.id,
        amount:         Number(uc.amount),
      };
    });

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
    currentUserPaid:      currentMemberId ? confirmedMap.has(currentMemberId) : false,
    myContributionDate:   myContrib?.createdAt
      ? new Date(myContrib.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : null,
    myContributionAmount: myContrib ? Number(myContrib.amount) : null,
    recentExpenses,
    pendingConfirmMembers,
  };
}
