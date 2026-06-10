import { cache } from "react";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { settlements } from "@/lib/db/schema/settlements";
import { groupMembers } from "@/lib/db/schema/group-members";
import { groups } from "@/lib/db/schema/groups";
import { eq, ne, sum, and, desc, sql, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { optimizeSettlements } from "@/lib/settle/optimize";
import { getMemberName } from "@/lib/utils";

export interface MemberBalanceRow {
  memberId: string;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  settlementsSent: number;
  settlementsReceived: number;
  net: number; // positive = owed money, negative = owes money
}

export async function getBalances(groupId: string, defaultCurrency: string) {
  const fetchBalances = unstable_cache(
    async () => {
      return _computeBalances(groupId, defaultCurrency);
    },
    ['balances', groupId, defaultCurrency],
    { tags: [`balances-${groupId}`] }
  );
  return fetchBalances();
}

async function _computeBalances(groupId: string, defaultCurrency: string) {
  const paidCte = db.$with('paid').as(
    db.select({ memberId: expenses.paidByMemberId, paidTotal: sum(expenses.amount).as('paid_total') })
      .from(expenses)
      .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false), eq(expenses.currency, defaultCurrency)))
      .groupBy(expenses.paidByMemberId)
  );

  const owedCte = db.$with('owed').as(
    db.select({ memberId: expenseSplits.memberId, owedTotal: sum(expenseSplits.shareAmount).as('owed_total') })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
      .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false), eq(expenses.currency, defaultCurrency)))
      .groupBy(expenseSplits.memberId)
  );

  // B-1 fix: only CONFIRMED settlements count toward balances.
  // An unconfirmed self-report (isConfirmed=false) is not a payment until the
  // creditor confirms receipt.  Including pending settlements here would
  // prematurely reduce the debtor's net and create a jarring "snap-back" if
  // the creditor disputes.
  const sentCte = db.$with('sent').as(
    db.select({ memberId: settlements.fromMemberId, sentTotal: sum(settlements.amount).as('sent_total') })
      .from(settlements)
      .where(and(eq(settlements.groupId, groupId), eq(settlements.isConfirmed, true)))
      .groupBy(settlements.fromMemberId)
  );

  const receivedCte = db.$with('received').as(
    db.select({ memberId: settlements.toMemberId, receivedTotal: sum(settlements.amount).as('received_total') })
      .from(settlements)
      .where(and(eq(settlements.groupId, groupId), eq(settlements.isConfirmed, true)))
      .groupBy(settlements.toMemberId)
  );

  const rows = await db.with(paidCte, owedCte, sentCte, receivedCte)
    .select({
      memberId: groupMembers.id,
      displayName: groupMembers.displayName,
      guestName: groupMembers.guestName,
      totalPaid:           sql<string>`coalesce(${paidCte.paidTotal}, '0')`,
      totalOwed:           sql<string>`coalesce(${owedCte.owedTotal}, '0')`,
      settlementsSent:     sql<string>`coalesce(${sentCte.sentTotal}, '0')`,
      settlementsReceived: sql<string>`coalesce(${receivedCte.receivedTotal}, '0')`,
    })
    .from(groupMembers)
    .leftJoin(paidCte,     eq(groupMembers.id, paidCte.memberId))
    .leftJoin(owedCte,     eq(groupMembers.id, owedCte.memberId))
    .leftJoin(sentCte,     eq(groupMembers.id, sentCte.memberId))
    .leftJoin(receivedCte, eq(groupMembers.id, receivedCte.memberId))
    .where(eq(groupMembers.groupId, groupId));

  const balances: MemberBalanceRow[] = rows.map((row) => {
    const totalPaid           = Number(row.totalPaid);
    const totalOwed           = Number(row.totalOwed);
    const settlementsSent     = Number(row.settlementsSent);
    const settlementsReceived = Number(row.settlementsReceived);
    const net = totalPaid - totalOwed + settlementsSent - settlementsReceived;

    return {
      memberId: row.memberId,
      displayName: getMemberName({ displayName: row.displayName, guestName: row.guestName }),
      totalPaid,
      totalOwed,
      settlementsSent,
      settlementsReceived,
      net: Math.round(net * 100) / 100,
    };
  });

  const suggestions = optimizeSettlements(balances.map((r) => ({ memberId: r.memberId, net: r.net })));

  const [mixedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false), ne(expenses.currency, defaultCurrency)));

  const hasMixedCurrencies = Number(mixedRow?.count ?? 0) > 0;

  return { balances, suggestions, hasMixedCurrencies };
}

export async function getSettlements(groupId: string) {
  return db
    .select()
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .orderBy(desc(settlements.settledAt))
    .limit(100);
}

/** Full aggregate total for all confirmed settlements in a group — not affected by the
 *  100-row display limit in getSettlements. Use this for any financial summary display. */
export async function getSettlementsTotal(groupId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(settlements.amount) })
    .from(settlements)
    .where(and(eq(settlements.groupId, groupId), eq(settlements.isConfirmed, true)));
  return Number(row?.total ?? 0);
}

// ── Home-page balance badges — ONE batched query for ALL the user's groups ────
// Each home-page card used to Suspense-stream its own getBalances() (a 4-CTE
// aggregate). With many groups + a max:3 connection pool, those N heavy queries
// serialise on cold load and the home page crawls. getHomeBalances computes just
// the *current user's net* (+ mixed-currency / has-expenses flags) for every
// group at once with a handful of grouped aggregates. React cache() dedupes it
// across all the GroupBalanceBadge instances in one render, so the underlying
// work runs ONCE no matter how many cards are on screen — Suspense streaming is
// preserved (shell paints instantly, badges fill in together).

export type HomeBalanceEntry = {
  net: number;                  // + = current user is owed, − = owes
  hasMixedCurrencies: boolean;  // group has expenses outside its default currency
  hasExpenses: boolean;         // group has any non-template expense
  currency: string;             // group default currency (for formatting)
};

export const getHomeBalances = cache(
  async (userId: string): Promise<Record<string, HomeBalanceEntry>> => {
    // Resolve the user's (group, member) pairs first — needed to build the cache
    // key. Tiny indexed lookup on group_members (user_id).
    const memberships = await db
      .select({ groupId: groupMembers.groupId, memberId: groupMembers.id })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));
    if (memberships.length === 0) return {};

    const sortedGroupIds = memberships.map((m) => m.groupId).sort();
    const fetch = unstable_cache(
      () => _computeHomeBalances(memberships),
      ["home-balances", userId, sortedGroupIds.join(",")],
      // Tag with every group's balance tag, so a mutation in ANY of the user's
      // groups (which calls revalidateTag(`balances-${id}`)) refreshes this batch.
      { tags: sortedGroupIds.map((id) => `balances-${id}`) },
    );
    return fetch();
  },
);

async function _computeHomeBalances(
  memberships: { groupId: string; memberId: string }[],
): Promise<Record<string, HomeBalanceEntry>> {
  const groupIds  = memberships.map((m) => m.groupId);
  const memberIds = memberships.map((m) => m.memberId);

  // memberIds are group-scoped (a group_members row belongs to exactly one
  // group), so filtering by `IN (memberIds)` already restricts each aggregate to
  // the current user's own rows per group — no per-group currency join needed.
  const [groupRows, paidRows, owedRows, sentRows, receivedRows, currencyRows] = await Promise.all([
    db.select({ id: groups.id, currency: groups.defaultCurrency })
      .from(groups)
      .where(inArray(groups.id, groupIds)),

    db.select({ groupId: expenses.groupId, currency: expenses.currency, total: sum(expenses.amount) })
      .from(expenses)
      .where(and(inArray(expenses.paidByMemberId, memberIds), eq(expenses.isTemplate, false)))
      .groupBy(expenses.groupId, expenses.currency),

    db.select({ groupId: expenses.groupId, currency: expenses.currency, total: sum(expenseSplits.shareAmount) })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
      .where(and(inArray(expenseSplits.memberId, memberIds), eq(expenses.isTemplate, false)))
      .groupBy(expenses.groupId, expenses.currency),

    db.select({ groupId: settlements.groupId, total: sum(settlements.amount) })
      .from(settlements)
      .where(and(inArray(settlements.fromMemberId, memberIds), eq(settlements.isConfirmed, true)))
      .groupBy(settlements.groupId),

    db.select({ groupId: settlements.groupId, total: sum(settlements.amount) })
      .from(settlements)
      .where(and(inArray(settlements.toMemberId, memberIds), eq(settlements.isConfirmed, true)))
      .groupBy(settlements.groupId),

    // Distinct currencies present per group — drives hasMixedCurrencies + hasExpenses
    db.select({ groupId: expenses.groupId, currency: expenses.currency })
      .from(expenses)
      .where(and(inArray(expenses.groupId, groupIds), eq(expenses.isTemplate, false)))
      .groupBy(expenses.groupId, expenses.currency),
  ]);

  const currencyByGroup = new Map(groupRows.map((g) => [g.id, g.currency]));

  // Paid / owed are summed only in the group's DEFAULT currency (matching
  // getBalances). Other-currency rows are excluded from the net.
  const paidByGroup = new Map<string, number>();
  for (const r of paidRows) {
    if (r.currency === currencyByGroup.get(r.groupId)) {
      paidByGroup.set(r.groupId, (paidByGroup.get(r.groupId) ?? 0) + Number(r.total ?? 0));
    }
  }
  const owedByGroup = new Map<string, number>();
  for (const r of owedRows) {
    if (r.currency === currencyByGroup.get(r.groupId)) {
      owedByGroup.set(r.groupId, (owedByGroup.get(r.groupId) ?? 0) + Number(r.total ?? 0));
    }
  }

  const sentByGroup     = new Map(sentRows.map((r) => [r.groupId, Number(r.total ?? 0)]));
  const receivedByGroup = new Map(receivedRows.map((r) => [r.groupId, Number(r.total ?? 0)]));

  const currenciesByGroup = new Map<string, Set<string>>();
  for (const r of currencyRows) {
    let set = currenciesByGroup.get(r.groupId);
    if (!set) { set = new Set(); currenciesByGroup.set(r.groupId, set); }
    set.add(r.currency);
  }

  const result: Record<string, HomeBalanceEntry> = {};
  for (const { groupId } of memberships) {
    const defaultCurrency = currencyByGroup.get(groupId) ?? "INR";
    const present = currenciesByGroup.get(groupId);
    const net =
      (paidByGroup.get(groupId) ?? 0) -
      (owedByGroup.get(groupId) ?? 0) +
      (sentByGroup.get(groupId) ?? 0) -
      (receivedByGroup.get(groupId) ?? 0);

    result[groupId] = {
      net: Math.round(net * 100) / 100,
      hasMixedCurrencies: present ? [...present].some((c) => c !== defaultCurrency) : false,
      hasExpenses: !!present && present.size > 0,
      currency: defaultCurrency,
    };
  }
  return result;
}
