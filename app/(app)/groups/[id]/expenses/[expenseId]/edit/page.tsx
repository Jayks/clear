import { notFound } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getExpenseWithSplits } from "@/lib/db/queries/expenses";
import { canUseNonEqualSplit } from "@/lib/subscription/gates";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/shared/back-button";
import { EditExpenseForm } from "./edit-expense-form";
import { formatDistanceToNow } from "date-fns";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id, expenseId } = await params;

  const [groupData, expenseData, nonEqualAllowed] = await Promise.all([
    getGroupWithMembers(id),
    getExpenseWithSplits(expenseId),
    canUseNonEqualSplit(id),
  ]);

  if (!groupData || !expenseData) notFound();
  if (expenseData.expense.groupId !== id) notFound();

  const { group, members, currentMember } = groupData;
  const { expense, splits } = expenseData;
  const isAdmin = currentMember?.role === "admin";

  const resolveName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const m = members.find((m) => m.userId === userId);
    return m ? (m.displayName ?? m.guestName ?? "Member") : null;
  };

  const creatorName = resolveName(expense.createdByUserId) ?? "Member";
  const editorName = resolveName(expense.updatedByUserId);
  const sameEditor = expense.updatedByUserId === expense.createdByUserId;

  const auditLine = editorName && sameEditor
    ? `Logged and last edited by ${creatorName} · ${formatDistanceToNow(expense.updatedAt, { addSuffix: true })}`
    : `Logged by ${creatorName} · ${formatDistanceToNow(expense.createdAt, { addSuffix: true })}`;

  const editLine = editorName && !sameEditor
    ? `Last edited by ${editorName} · ${formatDistanceToNow(expense.updatedAt, { addSuffix: true })}`
    : null;

  return (
    <div>
      {/* Desktop header — mobile nav carries the icon + title */}
      <div className="hidden md:flex items-center gap-2 mb-4">
        <BackButton
          href={`/groups/${id}/expenses`}
          label="Back to expenses"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        />
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-500/30 shrink-0">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
            Edit expense
          </h1>
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{auditLine}</p>
      {editLine && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">{editLine}</p>
      )}
      {!editLine && <div className="mb-6" />}

      <div className="glass rounded-2xl p-6">
        <EditExpenseForm
          group={group}
          members={members}
          expense={expense}
          splits={splits}
          canUseNonEqual={nonEqualAllowed}
        />
      </div>
    </div>
  );
}
