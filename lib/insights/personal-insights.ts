import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import type { CategorySlice } from "@/lib/insights/trip-insights";
import type { Settlement } from "@/lib/db/schema/settlements";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PersonalCompanion {
  userId: string;
  name: string;
  groupCount: number;
  totalShared: number;
  label: string;
  lastActiveDate: string | null;
}

export interface PersonalGroupShare {
  groupId: string;
  groupName: string;
  groupType: string;
  myShare: number;
  expenseCount: number;
}

export interface PersonalInsights {
  currency: string;
  totalShare: number;
  totalPaidUpfront: number;
  bankerFloat: number;
  bankerFloatPrevYear: number | null;
  expenseCount: number;
  firstExpenseDate: string | null;
  monthlyAverage: number;

  // Net position per group
  netByGroup: {
    groupId: string;
    groupName: string;
    groupType: string;
    net: number;
  }[];
  totalOwedToMe: number;
  totalIOwe: number;

  // Financial circle
  companions: PersonalCompanion[];

  // Category breakdown (your share)
  byCategory: CategorySlice[];

  // Per-group share breakdown
  byGroup: PersonalGroupShare[];

  // Opening sentence
  openingSentence: string;
  openingSub: string | null;

  // ONE triggered insight (most interesting fact right now)
  triggeredInsight: { text: string; icon: string } | null;
}

// ── Raw data shape from DB query ──────────────────────────────────────────

export interface PersonalSplitRow {
  shareAmount: string;
  category: string;
  expenseDate: string | null;
  groupId: string;
  currency: string;
  expenseAmount: string;
  paidByMemberId: string;
  myMemberId: string;
}

export interface PersonalGroupRow {
  id: string;
  name: string;
  groupType: string;
  defaultCurrency: string;
}

export interface PersonalPaidRow {
  groupId: string;
  total: string | null;
  cnt: string | null;
}

export interface PersonalCompanionRow {
  userId: string | null;
  displayName: string | null;
  guestName: string | null;
  groupId: string;
}

export interface MyMemberRow {
  memberId: string;
  groupId: string;
}

// ── Pure compute ──────────────────────────────────────────────────────────

export function computePersonalInsights(params: {
  splitRows: PersonalSplitRow[];
  paidRows: PersonalPaidRow[];
  settRows: Settlement[];
  groupRows: PersonalGroupRow[];
  companionRows: PersonalCompanionRow[];
  myMemberRows: MyMemberRow[];
}): PersonalInsights | null {
  const { splitRows, paidRows, settRows, groupRows, companionRows, myMemberRows } = params;

  if (splitRows.length === 0 && paidRows.length === 0) return null;

  // ── Primary currency (highest-volume) ──────────────────────────────────
  const currencyVolume = new Map<string, number>();
  for (const r of splitRows) {
    currencyVolume.set(r.currency, (currencyVolume.get(r.currency) ?? 0) + Number(r.shareAmount));
  }
  const primaryCurrency =
    [...currencyVolume.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "INR";

  // ── Maps ───────────────────────────────────────────────────────────────
  const groupMap = new Map(groupRows.map((g) => [g.id, g]));
  const groupMemberMap = new Map(myMemberRows.map((r) => [r.groupId, r.memberId]));
  const memberGroupMap = new Map(myMemberRows.map((r) => [r.memberId, r.groupId]));

  // Filter rows to primary currency
  const myRows = splitRows.filter((r) => r.currency === primaryCurrency);
  const primaryGroupIds = new Set(
    groupRows.filter((g) => g.defaultCurrency === primaryCurrency).map((g) => g.id)
  );

  // ── Core totals ────────────────────────────────────────────────────────
  const totalShare = myRows.reduce((s, r) => s + Number(r.shareAmount), 0);
  const totalPaidUpfront = paidRows
    .filter((r) => primaryGroupIds.has(r.groupId))
    .reduce((s, r) => s + Number(r.total ?? 0), 0);
  const bankerFloat = Math.max(0, Math.round((totalPaidUpfront - totalShare) * 100) / 100);
  const expenseCount = myRows.length;

  // ── Year-over-year banker float ────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  function computeFloatForYear(year: number): number {
    const yearRows = myRows.filter((r) => r.expenseDate?.startsWith(String(year)));
    const yearShare = yearRows.reduce((s, r) => s + Number(r.shareAmount), 0);
    const yearPaid = yearRows
      .filter((r) => r.paidByMemberId === r.myMemberId)
      .reduce((s, r) => s + Number(r.expenseAmount), 0);
    return Math.max(0, yearPaid - yearShare);
  }

  const thisYearFloat = computeFloatForYear(currentYear);
  const prevYearFloat = computeFloatForYear(prevYear);
  const bankerFloatPrevYear = prevYearFloat > 0 ? prevYearFloat : null;

  // ── Monthly average ────────────────────────────────────────────────────
  const dates = myRows.map((r) => r.expenseDate).filter(Boolean) as string[];
  dates.sort();
  const firstExpenseDate = dates[0] ?? null;

  let monthlyAverage = 0;
  if (firstExpenseDate && totalShare > 0) {
    const firstMonth = firstExpenseDate.slice(0, 7); // "YYYY-MM"
    const nowMonth = new Date().toISOString().slice(0, 7);
    const [fy, fm] = firstMonth.split("-").map(Number);
    const [ny, nm] = nowMonth.split("-").map(Number);
    const months = Math.max(1, (ny - fy) * 12 + (nm - fm) + 1);
    monthlyAverage = Math.round(totalShare / months);
  }

  // ── Net by group ───────────────────────────────────────────────────────
  const paidByGroupMap = new Map(paidRows.map((r) => [r.groupId, Number(r.total ?? 0)]));

  const netByGroup = Array.from(primaryGroupIds)
    .map((gid) => {
      const g = groupMap.get(gid);
      if (!g) return null;
      const myMemberId = groupMemberMap.get(gid);
      if (!myMemberId) return null;

      const myShareForGroup = myRows
        .filter((r) => r.groupId === gid)
        .reduce((s, r) => s + Number(r.shareAmount), 0);
      const myPaidForGroup = paidByGroupMap.get(gid) ?? 0;
      const settlSent = settRows
        .filter((r) => r.fromMemberId === myMemberId)
        .reduce((s, r) => s + Number(r.amount), 0);
      const settlReceived = settRows
        .filter((r) => r.toMemberId === myMemberId)
        .reduce((s, r) => s + Number(r.amount), 0);

      const net = Math.round((myPaidForGroup - myShareForGroup + settlReceived - settlSent) * 100) / 100;
      if (Math.abs(net) < 0.01) return null; // settled — skip

      return { groupId: gid, groupName: g.name, groupType: g.groupType, net };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const totalOwedToMe = netByGroup.filter((r) => r.net > 0).reduce((s, r) => s + r.net, 0);
  const totalIOwe = Math.abs(netByGroup.filter((r) => r.net < 0).reduce((s, r) => s + r.net, 0));

  // ── Category breakdown ─────────────────────────────────────────────────
  const catTotals = new Map<string, number>();
  for (const r of myRows) {
    catTotals.set(r.category, (catTotals.get(r.category) ?? 0) + Number(r.shareAmount));
  }
  const byCategory: CategorySlice[] = [...catTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      const cat = getCategory(category);
      return {
        category,
        label: cat.label,
        amount: Math.round(amount),
        percentage: totalShare > 0 ? Math.round((amount / totalShare) * 100) : 0,
        hex: CATEGORY_HEX[category] ?? CATEGORY_HEX.other,
      };
    });

  // ── Per-group share breakdown ──────────────────────────────────────────
  const groupShareMap = new Map<string, { share: number; count: number }>();
  for (const r of myRows) {
    const existing = groupShareMap.get(r.groupId) ?? { share: 0, count: 0 };
    groupShareMap.set(r.groupId, {
      share: existing.share + Number(r.shareAmount),
      count: existing.count + 1,
    });
  }

  const byGroup: PersonalGroupShare[] = [...groupShareMap.entries()]
    .map(([gid, { share, count }]) => {
      const g = groupMap.get(gid);
      if (!g) return null;
      return {
        groupId: gid,
        groupName: g.name,
        groupType: g.groupType,
        myShare: Math.round(share),
        expenseCount: count,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.myShare - a.myShare);

  // ── Financial circle (companions) ──────────────────────────────────────
  // Group companion rows by userId, count distinct groups, find last active date
  const companionMap = new Map<
    string,
    { name: string; groupIds: Set<string>; lastDate: string | null }
  >();

  for (const row of companionRows) {
    if (!row.userId) continue;
    const name = row.displayName ?? row.guestName ?? "Member";
    const existing = companionMap.get(row.userId);
    if (existing) {
      existing.groupIds.add(row.groupId);
    } else {
      companionMap.set(row.userId, { name, groupIds: new Set([row.groupId]), lastDate: null });
    }
  }

  // Find last active date per companion (last shared expense date)
  for (const r of myRows) {
    // For each expense, get all split members in the same expense from the data
    // (we use the group's last expense date as a proxy — sufficient for "last active")
  }

  // Use most-recent expense date in each shared group as "last active" proxy
  const lastDateByGroup = new Map<string, string>();
  for (const r of myRows) {
    const existing = lastDateByGroup.get(r.groupId);
    if (!existing || (r.expenseDate && r.expenseDate > existing)) {
      lastDateByGroup.set(r.groupId, r.expenseDate ?? "");
    }
  }

  const companions: PersonalCompanion[] = [...companionMap.entries()]
    .map(([userId, { name, groupIds }]) => {
      // Sum of my share in groups shared with this person
      const sharedGroupIds = [...groupIds];
      const totalShared = myRows
        .filter((r) => sharedGroupIds.includes(r.groupId))
        .reduce((s, r) => s + Number(r.shareAmount), 0);

      // Last active = latest expense date across shared groups
      const lastActiveDate =
        sharedGroupIds
          .map((gid) => lastDateByGroup.get(gid) ?? "")
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;

      return {
        userId,
        name,
        groupCount: groupIds.size,
        totalShared: Math.round(totalShared),
        label: "",       // filled below after sorting
        lastActiveDate,
      };
    })
    .filter((c) => c.totalShared > 0)
    .sort((a, b) => b.groupCount - a.groupCount || b.totalShared - a.totalShared)
    .slice(0, 5);

  // Assign labels based on rank + characteristics
  const totalGroupCount = myMemberRows.length; // rough proxy
  if (companions[0]) {
    if (companions[0].groupCount >= 3) {
      companions[0].label = "Your most shared companion";
    } else if (companions[0].totalShared > totalShare * 0.4) {
      companions[0].label = "Shares the most with you";
    } else {
      companions[0].label = "Regular companion";
    }
  }
  if (companions[1]) companions[1].label = "Frequent companion";
  for (let i = 2; i < companions.length; i++) companions[i].label = "Companion";

  // ── Opening sentence ───────────────────────────────────────────────────
  const sinceYear = firstExpenseDate?.slice(0, 4) ?? null;
  const uniquePeopleCount = new Set(companionRows.map((r) => r.userId ?? r.displayName ?? r.guestName)).size;
  const groupCount = myMemberRows.length;

  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: primaryCurrency,
    maximumFractionDigits: 0,
  }).format;

  const openingSentence = [
    sinceYear ? `Since ${sinceYear},` : "So far,",
    `you've shared ${fmt(totalShare)}`,
    uniquePeopleCount > 0 ? `with ${uniquePeopleCount} ${uniquePeopleCount === 1 ? "person" : "people"}` : null,
    groupCount > 0 ? `across ${groupCount} ${groupCount === 1 ? "group" : "groups"}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const openingSub =
    bankerFloat > 0 && totalShare > 0 && bankerFloat / totalShare > 0.15
      ? "You almost always pay first — and always get paid back."
      : null;

  // ── Triggered insight ──────────────────────────────────────────────────
  let triggeredInsight: PersonalInsights["triggeredInsight"] = null;

  // Rule 1: Companion dominance
  const dominantCompanion = companions[0];
  if (dominantCompanion && dominantCompanion.groupCount >= 3 && !triggeredInsight) {
    triggeredInsight = {
      icon: "👥",
      text: `${dominantCompanion.name} is in ${dominantCompanion.groupCount} of your groups. You've shared ${fmt(dominantCompanion.totalShared)} together.`,
    };
  }

  // Rule 2: Heavy banker
  if (!triggeredInsight && bankerFloat > 0 && totalShare > 0 && bankerFloat / totalShare > 0.3) {
    const trendText =
      bankerFloatPrevYear !== null && thisYearFloat > bankerFloatPrevYear * 1.2
        ? " — more than last year."
        : ".";
    triggeredInsight = {
      icon: "💳",
      text: `You front the money for your groups — you've floated ${fmt(bankerFloat)} more than your actual share${trendText}`,
    };
  }

  // Rule 3: YoY spending trajectory
  if (!triggeredInsight) {
    const thisYearTotal = myRows
      .filter((r) => r.expenseDate?.startsWith(String(currentYear)))
      .reduce((s, r) => s + Number(r.shareAmount), 0);
    const prevYearTotal = myRows
      .filter((r) => r.expenseDate?.startsWith(String(prevYear)))
      .reduce((s, r) => s + Number(r.shareAmount), 0);
    const nowMonth = new Date().getMonth() + 1; // 1-12
    const prevYearSamePoint = myRows
      .filter((r) => {
        const [y, m] = (r.expenseDate ?? "").split("-").map(Number);
        return y === prevYear && m <= nowMonth;
      })
      .reduce((s, r) => s + Number(r.shareAmount), 0);

    if (prevYearSamePoint > 0 && thisYearTotal > prevYearSamePoint * 1.3) {
      const pct = Math.round(((thisYearTotal - prevYearSamePoint) / prevYearSamePoint) * 100);
      triggeredInsight = {
        icon: "📈",
        text: `Your shared spending is up ${pct}% vs the same point last year.`,
      };
    }
  }

  // Rule 4: Milestone crossing
  if (!triggeredInsight) {
    const milestones = [500000, 200000, 100000, 50000, 20000];
    for (const m of milestones) {
      if (totalShare >= m) {
        triggeredInsight = {
          icon: "🎯",
          text: `You've crossed ${fmt(m)} in total shared spending — a significant milestone.`,
        };
        break;
      }
    }
  }

  return {
    currency: primaryCurrency,
    totalShare: Math.round(totalShare),
    totalPaidUpfront: Math.round(totalPaidUpfront),
    bankerFloat,
    bankerFloatPrevYear,
    expenseCount,
    firstExpenseDate,
    monthlyAverage,
    netByGroup,
    totalOwedToMe: Math.round(totalOwedToMe),
    totalIOwe: Math.round(totalIOwe),
    companions,
    byCategory,
    byGroup,
    openingSentence,
    openingSub,
    triggeredInsight,
  };
}
