import { getGroupExpensesWithSplits } from "@/lib/db/queries/expenses";
import { SettlementBreakdown } from "@/components/settlement/settlement-breakdown";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { MemberBalanceRow } from "@/lib/db/queries/balances";
import type { Transaction } from "@/lib/settle/optimize";

interface Props {
  groupId: string;
  members: GroupMember[];
  balances: MemberBalanceRow[];
  suggestions: Transaction[];
  currency: string;
  pastSettlementsTotal: number;
}

export async function SettleBreakdownSection({
  groupId,
  members,
  balances,
  suggestions,
  currency,
  pastSettlementsTotal,
}: Props) {
  const expensesWithSplits = await getGroupExpensesWithSplits(groupId);
  return (
    <SettlementBreakdown
      expensesWithSplits={expensesWithSplits}
      members={members}
      balances={balances}
      suggestions={suggestions}
      currency={currency}
      pastSettlementsTotal={pastSettlementsTotal}
    />
  );
}
