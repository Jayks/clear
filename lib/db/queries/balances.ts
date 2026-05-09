import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";
import { settlements } from "@/lib/db/schema/settlements";
import { tripMembers } from "@/lib/db/schema/trip-members";
import { eq, sum } from "drizzle-orm";
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

export async function getBalances(tripId: string) {
  const members = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));

  // 4 aggregated queries regardless of member count (replaces n*4 individual queries)
  const [paidRows, owedRows, sentRows, receivedRows] = await Promise.all([
    db
      .select({ memberId: expenses.paidByMemberId, total: sum(expenses.amount) })
      .from(expenses)
      .where(eq(expenses.tripId, tripId))
      .groupBy(expenses.paidByMemberId),

    db
      .select({ memberId: expenseSplits.memberId, total: sum(expenseSplits.shareAmount) })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
      .where(eq(expenses.tripId, tripId))
      .groupBy(expenseSplits.memberId),

    db
      .select({ memberId: settlements.fromMemberId, total: sum(settlements.amount) })
      .from(settlements)
      .where(eq(settlements.tripId, tripId))
      .groupBy(settlements.fromMemberId),

    db
      .select({ memberId: settlements.toMemberId, total: sum(settlements.amount) })
      .from(settlements)
      .where(eq(settlements.tripId, tripId))
      .groupBy(settlements.toMemberId),
  ]);

  const toMap = (rows: { memberId: string; total: string | null }[]) =>
    new Map(rows.map((r) => [r.memberId, Number(r.total ?? 0)]));

  const paid     = toMap(paidRows);
  const owed     = toMap(owedRows);
  const sent     = toMap(sentRows);
  const received = toMap(receivedRows);

  const rows: MemberBalanceRow[] = members.map((member) => {
    const totalPaid        = paid.get(member.id) ?? 0;
    const totalOwed        = owed.get(member.id) ?? 0;
    const settlementsSent  = sent.get(member.id) ?? 0;
    const settlementsRecvd = received.get(member.id) ?? 0;

    // sent: you paid someone → reduces your debt → adds to net
    // received: someone paid you → your receivable shrinks → subtracts from net
    const net = totalPaid - totalOwed + settlementsSent - settlementsRecvd;

    return {
      memberId: member.id,
      displayName: getMemberName(member),
      totalPaid,
      totalOwed,
      settlementsSent,
      settlementsReceived: settlementsRecvd,
      net: Math.round(net * 100) / 100,
    };
  });

  const suggestions = optimizeSettlements(rows.map((r) => ({ memberId: r.memberId, net: r.net })));

  return { balances: rows, suggestions };
}

export async function getSettlements(tripId: string) {
  return db
    .select()
    .from(settlements)
    .where(eq(settlements.tripId, tripId))
    .orderBy(settlements.settledAt);
}
