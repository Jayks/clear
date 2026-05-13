import { notFound } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getExpenseWithSplits } from "@/lib/db/queries/expenses";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditExpenseForm } from "./edit-expense-form";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id, expenseId } = await params;

  const [groupData, expenseData] = await Promise.all([
    getGroupWithMembers(id),
    getExpenseWithSplits(expenseId),
  ]);

  if (!groupData || !expenseData) notFound();
  if (expenseData.expense.groupId !== id) notFound();

  const { group, members, currentMember } = groupData;
  const { expense, splits } = expenseData;
  const isAdmin = currentMember?.role === "admin";

  return (
    <div className="max-w-xl">
      <Link
        href={`/groups/${id}/expenses`}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to expenses
      </Link>

      <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        Edit expense
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{group.name}</p>

      <div className="glass rounded-2xl p-6">
        <EditExpenseForm
          group={group}
          members={members}
          expense={expense}
          splits={splits}
        />
      </div>
    </div>
  );
}
