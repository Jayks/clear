import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { settlements } from "@/lib/db/schema/settlements";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, sum, and, desc, sql } from "drizzle-orm";
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

export async function getBalances(groupId: string) {
  const paidCte = db.$with('paid').as(
    db.select({ memberId: expenses.paidByMemberId, paidTotal: sum(expenses.amount).as('paid_total') })
      .from(expenses)
      .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false)))
      .groupBy(expenses.paidByMemberId)
  );

  const owedCte = db.$with('owed').as(
    db.select({ memberId: expenseSplits.memberId, owedTotal: sum(expenseSplits.shareAmount).as('owed_total') })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
      .where(and(eq(expenses.groupId, groupId), eq(expenses.isTemplate, false)))
      .groupBy(expenseSplits.memberId)
  );

  const sentCte = db.$with('sent').as(
    db.select({ memberId: settlements.fromMemberId, sentTotal: sum(settlements.amount).as('sent_total') })
      .from(settlements)
      .where(eq(settlements.groupId, groupId))
      .groupBy(settlements.fromMemberId)
  );

  const receivedCte = db.$with('received').as(
    db.select({ memberId: settlements.toMemberId, receivedTotal: sum(settlements.amount).as('received_total') })
      .from(settlements)
      .where(eq(settlements.groupId, groupId))
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
  return { balances, suggestions };
}

export async function getSettlements(groupId: string) {
  return db
    .select()
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .orderBy(desc(settlements.settledAt))
    .limit(100);
}
