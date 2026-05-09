import type { TripMember } from "@/lib/db/schema/trip-members";
import type { Expense } from "@/lib/db/schema/expenses";
import type { ExpenseSplit } from "@/lib/db/schema/expense-splits";

export type MemberRole =
  | "trip_banker"
  | "tab_master"
  | "high_roller"
  | "fair_splitter"
  | "the_balancer"
  | "traveler";

export interface RoleInfo {
  emoji: string;
  label: string;
  description: string;
  bgColor: string;
  textColor: string;
}

export const ROLE_INFO: Record<MemberRole, RoleInfo> = {
  trip_banker:   { emoji: "🏦", label: "Trip Banker",   description: "Covered the most by value",         bgColor: "bg-cyan-100",   textColor: "text-cyan-700"   },
  tab_master:    { emoji: "🧾", label: "Tab Master",    description: "Picked up the most tabs",           bgColor: "bg-teal-100",   textColor: "text-teal-700"   },
  high_roller:   { emoji: "💳", label: "High Roller",   description: "Biggest average spend per expense", bgColor: "bg-purple-100", textColor: "text-purple-700" },
  fair_splitter: { emoji: "⚖️", label: "Fair Splitter", description: "Almost always splits equally",      bgColor: "bg-green-100",  textColor: "text-green-700"  },
  the_balancer:  { emoji: "🎯", label: "The Balancer",  description: "Paid almost exactly their share",   bgColor: "bg-blue-100",   textColor: "text-blue-700"   },
  traveler:      { emoji: "✈️", label: "Traveler",      description: "Along for the ride",                bgColor: "bg-slate-100",  textColor: "text-slate-600"  },
};

interface MemberStats {
  memberId: string;
  totalPaid: number;
  totalOwed: number;
  net: number;
  expenseCount: number;
  avgExpenseAmount: number;
  equalSplitPct: number;
}

export interface MemberRoleResult {
  memberId: string;
  name: string;
  role: MemberRole;
  totalPaid: number;
  expenseCount: number;
}

export interface GroupRolesResult {
  memberRoles: MemberRoleResult[];
  fairnessScore: number;
  fairnessLabel: string;
  fairnessEmoji: string;
  hasData: boolean;
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeGroupRoles(params: {
  members: TripMember[];
  expensesWithSplits: { expense: Expense; splits: ExpenseSplit[] }[];
}): GroupRolesResult {
  const { members, expensesWithSplits } = params;

  if (expensesWithSplits.length === 0) {
    return {
      memberRoles: members.map((m) => ({
        memberId: m.id,
        name: m.displayName ?? m.guestName ?? "Member",
        role: "traveler",
        totalPaid: 0,
        expenseCount: 0,
      })),
      fairnessScore: 100,
      fairnessLabel: "No expenses yet",
      fairnessEmoji: "✨",
      hasData: false,
    };
  }

  // Accumulate per-member stats
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};
  const expCount: Record<string, number> = {};
  const eqCount: Record<string, number> = {};

  for (const { expense, splits } of expensesWithSplits) {
    const mid = expense.paidByMemberId;
    paid[mid] = r2((paid[mid] ?? 0) + Number(expense.amount));
    expCount[mid] = (expCount[mid] ?? 0) + 1;
    if (splits[0]?.splitType === "equal") {
      eqCount[mid] = (eqCount[mid] ?? 0) + 1;
    }
    for (const s of splits) {
      owed[s.memberId] = r2((owed[s.memberId] ?? 0) + Number(s.shareAmount));
    }
  }

  const stats: MemberStats[] = members.map((m) => {
    const totalPaid = paid[m.id] ?? 0;
    const totalOwed = owed[m.id] ?? 0;
    const count = expCount[m.id] ?? 0;
    return {
      memberId: m.id,
      totalPaid,
      totalOwed,
      net: r2(totalPaid - totalOwed),
      expenseCount: count,
      avgExpenseAmount: count > 0 ? r2(totalPaid / count) : 0,
      equalSplitPct: count > 0 ? Math.round(((eqCount[m.id] ?? 0) / count) * 100) : 0,
    };
  });

  // Fairness score
  const { fairnessScore, fairnessLabel, fairnessEmoji } = computeFairness(stats);

  // Unique roles: Trip Banker (top payer) and Tab Master (top tab count, different person)
  const payers = stats.filter((s) => s.totalPaid > 0).sort((a, b) => b.totalPaid - a.totalPaid);
  const byCount = stats.filter((s) => s.expenseCount >= 2).sort((a, b) => b.expenseCount - a.expenseCount || b.totalPaid - a.totalPaid);

  const topPayer = payers[0];
  const topTabPicker = byCount[0]?.memberId !== topPayer?.memberId ? byCount[0] : byCount[1];

  // Group avg expense for High Roller threshold
  const payersWithMultiple = payers.filter((s) => s.expenseCount >= 2);
  const groupAvgExpense =
    payersWithMultiple.length > 0
      ? payersWithMultiple.reduce((s, m) => s + m.avgExpenseAmount, 0) / payersWithMultiple.length
      : 0;

  // Assign roles
  const roleMap = new Map<string, MemberRole>();

  if (topPayer) roleMap.set(topPayer.memberId, "trip_banker");
  if (topTabPicker) roleMap.set(topTabPicker.memberId, "tab_master");

  for (const s of stats) {
    if (roleMap.has(s.memberId)) continue;

    if (s.expenseCount >= 2 && groupAvgExpense > 0 && s.avgExpenseAmount >= groupAvgExpense * 1.5) {
      roleMap.set(s.memberId, "high_roller");
    } else if (s.expenseCount >= 2 && s.equalSplitPct >= 75) {
      roleMap.set(s.memberId, "fair_splitter");
    } else if (s.totalOwed > 0 && Math.abs(s.net) <= s.totalOwed * 0.1) {
      roleMap.set(s.memberId, "the_balancer");
    } else {
      roleMap.set(s.memberId, "traveler");
    }
  }

  const memberRoles: MemberRoleResult[] = members.map((m) => ({
    memberId: m.id,
    name: m.displayName ?? m.guestName ?? "Member",
    role: roleMap.get(m.id) ?? "traveler",
    totalPaid: paid[m.id] ?? 0,
    expenseCount: expCount[m.id] ?? 0,
  }));

  return { memberRoles, fairnessScore, fairnessLabel, fairnessEmoji, hasData: true };
}

function computeFairness(stats: MemberStats[]) {
  const totalSpend = stats.reduce((s, m) => s + m.totalPaid, 0);

  if (totalSpend === 0 || stats.length < 2) {
    return { fairnessScore: 100, fairnessLabel: "No data yet", fairnessEmoji: "✨" };
  }

  // Standard deviation of payment-share percentages
  const shares = stats.map((s) => (s.totalPaid / totalSpend) * 100);
  const mean = 100 / stats.length;
  const variance = shares.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / shares.length;
  const stddev = Math.sqrt(variance);

  const score = Math.max(0, Math.round(100 - stddev * 2));

  let fairnessLabel: string;
  let fairnessEmoji: string;
  if (score >= 85)      { fairnessLabel = "Perfectly balanced"; fairnessEmoji = "✨"; }
  else if (score >= 65) { fairnessLabel = "Pretty fair";        fairnessEmoji = "👍"; }
  else if (score >= 45) { fairnessLabel = "Some carried more";  fairnessEmoji = "🤷"; }
  else                  { fairnessLabel = "One bankrolled it";  fairnessEmoji = "🏦"; }

  return { fairnessScore: score, fairnessLabel, fairnessEmoji };
}
