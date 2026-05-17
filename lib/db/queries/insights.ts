import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { eq, sum, count, inArray, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { computeAllTripsInsights } from "@/lib/insights/all-trips-insights";
import { computeAllNestsInsights } from "@/lib/insights/all-nests-insights";
import type { TripSummary } from "@/lib/insights/all-trips-insights";
import type { OtherTripSummary } from "@/lib/insights/cross-trip";

export async function getAllTripsInsightsData() {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id));

  if (memberships.length === 0) return null;
  const allGroupIds = memberships.map((m) => m.groupId);

  const [tripGroups, allMembers] = await Promise.all([
    db.select().from(groups).where(
      and(inArray(groups.id, allGroupIds), eq(groups.groupType, "trip"))
    ),
    db.select().from(groupMembers).where(inArray(groupMembers.groupId, allGroupIds)),
  ]);

  if (tripGroups.length === 0) return null;
  const tripIds = tripGroups.map((g) => g.id);

  const perTripTotals = await db
    .select({ groupId: expenses.groupId, total: sum(expenses.amount), cnt: count(expenses.id) })
    .from(expenses)
    .where(and(inArray(expenses.groupId, tripIds), eq(expenses.isTemplate, false)))
    .groupBy(expenses.groupId);

  const totalMap = new Map(perTripTotals.map((r) => [r.groupId, r]));
  const summaries: TripSummary[] = tripGroups.map((group) => {
    const t = totalMap.get(group.id);
    return {
      tripId: group.id,
      name: group.name,
      totalSpend: Number(t?.total ?? 0),
      expenseCount: Number(t?.cnt ?? 0),
      memberCount: allMembers.filter((m) => m.groupId === group.id).length,
      currency: group.defaultCurrency,
    };
  });

  const catRows = await db
    .select({ category: expenses.category, total: sum(expenses.amount) })
    .from(expenses)
    .where(and(inArray(expenses.groupId, tripIds), eq(expenses.isTemplate, false)))
    .groupBy(expenses.category);

  const categoryTotals: Record<string, number> = {};
  for (const row of catRows) categoryTotals[row.category] = Number(row.total ?? 0);

  const tripMembers = allMembers.filter((m) => tripIds.includes(m.groupId));
  return computeAllTripsInsights({ trips: tripGroups, summaries, categoryTotals, allMembers: tripMembers, currentUserId: user.id });
}

export async function getAllNestsInsightsData() {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id));

  if (memberships.length === 0) return null;
  const allGroupIds = memberships.map((m) => m.groupId);

  const [nestGroups, allMembers] = await Promise.all([
    db.select().from(groups).where(
      and(inArray(groups.id, allGroupIds), eq(groups.groupType, "nest"))
    ),
    db.select().from(groupMembers).where(inArray(groupMembers.groupId, allGroupIds)),
  ]);

  if (nestGroups.length === 0) return null;
  const nestIds = nestGroups.map((g) => g.id);

  const nestWhere = and(inArray(expenses.groupId, nestIds), eq(expenses.isTemplate, false));

  // Fetch only the columns computeAllNestsInsights actually reads; aggregate categories in DB
  const [allExpenses, catRows] = await Promise.all([
    db.select({
      groupId: expenses.groupId,
      amount: expenses.amount,
      expenseDate: expenses.expenseDate,
      sourceTemplateId: expenses.sourceTemplateId,
    }).from(expenses).where(nestWhere).orderBy(expenses.expenseDate),
    db.select({ category: expenses.category, total: sum(expenses.amount) })
      .from(expenses).where(nestWhere).groupBy(expenses.category),
  ]);

  const categoryTotals: Record<string, number> = {};
  for (const row of catRows) categoryTotals[row.category] = Number(row.total ?? 0);

  const nestMembers = allMembers.filter((m) => nestIds.includes(m.groupId));
  return computeAllNestsInsights({ nests: nestGroups, allExpenses, categoryTotals, allMembers: nestMembers, currentUserId: user.id });
}

export async function getOtherTripsSummary(currentGroupId: string): Promise<OtherTripSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id));

  const otherGroupIds = memberships.map((m) => m.groupId).filter((id) => id !== currentGroupId);
  if (otherGroupIds.length === 0) return [];

  const [otherGroups, memberCounts, expTotals, catRows] = await Promise.all([
    db.select().from(groups).where(
      and(inArray(groups.id, otherGroupIds), eq(groups.groupType, "trip"))
    ),
    db
      .select({ groupId: groupMembers.groupId, n: count() })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, otherGroupIds))
      .groupBy(groupMembers.groupId),
    db
      .select({ groupId: expenses.groupId, total: sum(expenses.amount) })
      .from(expenses)
      .where(and(inArray(expenses.groupId, otherGroupIds), eq(expenses.isTemplate, false)))
      .groupBy(expenses.groupId),
    db
      .select({ groupId: expenses.groupId, category: expenses.category, total: sum(expenses.amount) })
      .from(expenses)
      .where(and(inArray(expenses.groupId, otherGroupIds), eq(expenses.isTemplate, false)))
      .groupBy(expenses.groupId, expenses.category),
  ]);

  const memberMap = new Map(memberCounts.map((r) => [r.groupId, r.n]));
  const totalMap = new Map(expTotals.map((r) => [r.groupId, Number(r.total ?? 0)]));
  const catMap = new Map<string, Record<string, number>>();
  for (const row of catRows) {
    if (!catMap.has(row.groupId)) catMap.set(row.groupId, {});
    catMap.get(row.groupId)![row.category] = Number(row.total ?? 0);
  }

  return otherGroups.map((g) => ({
    tripId: g.id,
    totalSpend: totalMap.get(g.id) ?? 0,
    memberCount: memberMap.get(g.id) ?? 0,
    startDate: g.startDate,
    endDate: g.endDate,
    currency: g.defaultCurrency,
    categoryTotals: catMap.get(g.id) ?? {},
  }));
}
