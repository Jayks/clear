import { getGroupExpensesWithSplits } from "@/lib/db/queries/expenses";
import { SettlementBreakdown } from "@/components/settlement/settlement-breakdown";
import type { GroupMember } from "@/lib/db/schema/group-members";

interface Props {
  groupId: string;
  members: GroupMember[];
  currency: string;
}

export async function SettleBreakdownSection({ groupId, members, currency }: Props) {
  const expensesWithSplits = await getGroupExpensesWithSplits(groupId);
  return (
    <SettlementBreakdown
      expensesWithSplits={expensesWithSplits}
      members={members}
      currency={currency}
    />
  );
}
