import { cache } from "react";
import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { settlements } from "@/lib/db/schema/settlements";
import { streamSettlements } from "@/lib/db/schema/stream-settlements";
import { circleContributions } from "@/lib/db/schema/circle-contributions";
import { eq, sum, count, inArray, and, sql, ne, isNotNull, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { computeAllTripsInsights } from "@/lib/insights/all-trips-insights";
import { computeAllNestsInsights } from "@/lib/insights/all-nests-insights";
import { computePersonalInsights } from "@/lib/insights/personal-insights";
import type { TripSummary } from "@/lib/insights/all-trips-insights";
import type { OtherTripSummary } from "@/lib/insights/cross-trip";

const getUserGroupIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  return rows.map((r) => r.groupId);
});

export async function getAllTripsInsightsData() {
  const user = await getCurrentUser();
  if (!user) return null;

  const allGroupIds = await getUserGroupIds(user.id);
  if (allGroupIds.length === 0) return null;

  const tripGroupSubquery = db
    .select({ id: groups.id })
    .from(groups)
    .where(and(inArray(groups.id, allGroupIds), eq(groups.groupType, "trip")));

  const [tripGroups, tripMembers] = await Promise.all([
    db.select().from(groups).where(and(inArray(groups.id, allGroupIds), eq(groups.groupType, "trip"))),
    db.select().from(groupMembers).where(inArray(groupMembers.groupId, tripGroupSubquery)),
  ]);

  if (tripGroups.length === 0) return null;
  const tripIds = tripGroups.map((g) => g.id);

  const [perTripTotals, catRows] = await Promise.all([
    db.select({ groupId: expenses.groupId, total: sum(expenses.amount), cnt: count(expenses.id) })
      .from(expenses)
      .where(and(inArray(expenses.groupId, tripIds), eq(expenses.isTemplate, false)))
      .groupBy(expenses.groupId),
    db.select({ category: expenses.category, total: sum(expenses.amount) })
      .from(expenses)
      .where(and(inArray(expenses.groupId, tripIds), eq(expenses.isTemplate, false)))
      .groupBy(expenses.category),
  ]);

  const totalMap = new Map(perTripTotals.map((r) => [r.groupId, r]));
  const summaries: TripSummary[] = tripGroups.map((group) => {
    const t = totalMap.get(group.id);
    return {
      tripId: group.id,
      name: group.name,
      totalSpend: Number(t?.total ?? 0),
      expenseCount: Number(t?.cnt ?? 0),
      memberCount: tripMembers.filter((m) => m.groupId === group.id).length,
      currency: group.defaultCurrency,
      startDate: group.startDate,
      endDate: group.endDate,
    };
  });

  const categoryTotals: Record<string, number> = {};
  for (const row of catRows) categoryTotals[row.category] = Number(row.total ?? 0);

  return computeAllTripsInsights({ trips: tripGroups, summaries, categoryTotals, allMembers: tripMembers, currentUserId: user.id });
}

export async function getAllNestsInsightsData() {
  const user = await getCurrentUser();
  if (!user) return null;

  const allGroupIds = await getUserGroupIds(user.id);
  if (allGroupIds.length === 0) return null;

  const nestGroupSubquery = db
    .select({ id: groups.id })
    .from(groups)
    .where(and(inArray(groups.id, allGroupIds), eq(groups.groupType, "nest")));

  const [nestGroups, nestMembers] = await Promise.all([
    db.select().from(groups).where(and(inArray(groups.id, allGroupIds), eq(groups.groupType, "nest"))),
    db.select().from(groupMembers).where(inArray(groupMembers.groupId, nestGroupSubquery)),
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

  return computeAllNestsInsights({
    nests: nestGroups,
    allExpenses,
    categoryTotals,
    allMembers: nestMembers,
    currentUserId: user.id,
    currency: nestGroups[0]?.defaultCurrency ?? "INR",
  });
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

// ── Personal ("You" tab) ──────────────────────────────────────────────────

export async function getPersonalInsightsData() {
  const user = await getCurrentUser();
  if (!user) return null;

  // My member rows across all non-demo groups
  const myMemberRows = await db
    .select({ memberId: groupMembers.id, groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(and(eq(groupMembers.userId, user.id), eq(groups.isDemo, false)));

  if (myMemberRows.length === 0) return null;

  const myMemberIds = myMemberRows.map((r) => r.memberId);
  const myGroupIds = myMemberRows.map((r) => r.groupId);

  const [splitRows, paidRows, settRows, groupRows, companionRows, paymentMethodRows] = await Promise.all([
    // My expense splits with full context
    db
      .select({
        shareAmount: expenseSplits.shareAmount,
        category: expenses.category,
        expenseDate: expenses.expenseDate,
        groupId: expenses.groupId,
        currency: expenses.currency,
        expenseAmount: expenses.amount,
        paidByMemberId: expenses.paidByMemberId,
        myMemberId: expenseSplits.memberId,
      })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
      .where(and(inArray(expenseSplits.memberId, myMemberIds), eq(expenses.isTemplate, false))),

    // Totals of expenses where I was the payer (per group)
    db
      .select({
        groupId: expenses.groupId,
        total: sum(expenses.amount),
        cnt: count(expenses.id),
      })
      .from(expenses)
      .where(and(inArray(expenses.paidByMemberId, myMemberIds), eq(expenses.isTemplate, false)))
      .groupBy(expenses.groupId),

    // Settlements involving my member IDs — confirmed only (I-1 fix).
    // Unconfirmed self-reports must not shift the "You" tab net positions before
    // the creditor confirms receipt. Consistent with the balances.ts sentCte/
    // receivedCte fix (B-1) and the paymentMethodRows query below which already
    // filtered isConfirmed=true.
    db
      .select()
      .from(settlements)
      .where(
        and(
          or(
            inArray(settlements.fromMemberId, myMemberIds),
            inArray(settlements.toMemberId, myMemberIds),
          ),
          eq(settlements.isConfirmed, true),
        )
      ),

    // Group metadata
    db
      .select({
        id: groups.id,
        name: groups.name,
        groupType: groups.groupType,
        defaultCurrency: groups.defaultCurrency,
      })
      .from(groups)
      .where(inArray(groups.id, myGroupIds)),

    // Other Clear-account members in my groups (companions)
    db
      .select({
        userId: groupMembers.userId,
        displayName: groupMembers.displayName,
        guestName: groupMembers.guestName,
        groupId: groupMembers.groupId,
      })
      .from(groupMembers)
      .where(
        and(
          inArray(groupMembers.groupId, myGroupIds),
          isNotNull(groupMembers.userId),
          ne(groupMembers.userId, user.id),
        )
      ),

    // Payment method stats — union across trips/nests (fromMember), streams (recordedBy), circles (memberId)
    // Aggregated in JS to avoid a complex SQL UNION — volumes are small enough.
    (async (): Promise<{ paymentMethod: string; total: string | null; cnt: string | null }[]> => {
      const [tripNestRows, streamRows, circleRows] = await Promise.all([
        // Trip/nest settlements where I was the payer
        db
          .select({
            paymentMethod: settlements.paymentMethod,
            total: sum(settlements.amount).as("total"),
            cnt:   count(settlements.id).as("cnt"),
          })
          .from(settlements)
          .where(
            and(
              inArray(settlements.fromMemberId, myMemberIds),
              sql`${settlements.isConfirmed} = true`,
              isNotNull(settlements.paymentMethod),
            )
          )
          .groupBy(settlements.paymentMethod),

        // Stream settlements I recorded (I was the payer)
        db
          .select({
            paymentMethod: streamSettlements.paymentMethod,
            total: sum(streamSettlements.amount).as("total"),
            cnt:   count(streamSettlements.id).as("cnt"),
          })
          .from(streamSettlements)
          .where(
            and(
              eq(streamSettlements.recordedBy, user.id),
              isNotNull(streamSettlements.paymentMethod),
            )
          )
          .groupBy(streamSettlements.paymentMethod),

        // Circle contributions I made (confirmed)
        db
          .select({
            paymentMethod: circleContributions.paymentMethod,
            total: sum(circleContributions.amount).as("total"),
            cnt:   count(circleContributions.id).as("cnt"),
          })
          .from(circleContributions)
          .where(
            and(
              inArray(circleContributions.memberId, myMemberIds),
              sql`${circleContributions.isConfirmed} = true`,
              isNotNull(circleContributions.paymentMethod),
            )
          )
          .groupBy(circleContributions.paymentMethod),
      ]);

      // Aggregate by paymentMethod across all three contexts
      const totals = new Map<string, { total: number; cnt: number }>();
      for (const row of [...tripNestRows, ...streamRows, ...circleRows]) {
        if (!row.paymentMethod) continue;
        const existing = totals.get(row.paymentMethod) ?? { total: 0, cnt: 0 };
        totals.set(row.paymentMethod, {
          total: existing.total + Number(row.total ?? 0),
          cnt:   existing.cnt   + Number(row.cnt   ?? 0),
        });
      }

      return [...totals.entries()].map(([paymentMethod, { total, cnt }]) => ({
        paymentMethod,
        total: String(total),
        cnt:   String(cnt),
      }));
    })(),
  ]);

  return computePersonalInsights({
    splitRows: splitRows.map((r) => ({
      ...r,
      shareAmount: String(r.shareAmount),
      expenseAmount: String(r.expenseAmount),
      expenseDate: r.expenseDate ?? null,
    })),
    paidRows: paidRows.map((r) => ({
      groupId: r.groupId,
      total: r.total ? String(r.total) : null,
      cnt: r.cnt ? String(r.cnt) : null,
    })),
    settRows,
    groupRows: groupRows.map((r) => ({ ...r, groupType: r.groupType ?? "trip" })),
    companionRows: companionRows.map((r) => ({
      userId: r.userId ?? null,
      displayName: r.displayName ?? null,
      guestName: r.guestName ?? null,
      groupId: r.groupId,
    })),
    myMemberRows,
    paymentMethodRows,
  });
}
