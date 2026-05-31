"use client";

import { useState, useTransition } from "react";
import { deleteExpense } from "@/app/actions/expenses";
import { formatCurrency } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { CategoryIcon } from "@/components/expense/category-icon";
import { toast } from "sonner";
import { hapticDelete } from "@/lib/haptics";
import { Trash2 } from "lucide-react";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AnimatedList } from "@/components/shared/animated-list";
import { formatDate } from "@/lib/utils";

interface Props {
  expenses:      Expense[];
  members:       GroupMember[];
  currency:      string;
  isAdmin:       boolean;
  groupId:       string;
}

function ExpenseRow({
  expense,
  currency,
  isAdmin,
  groupId,
  payerName,
}: {
  expense:   Expense;
  currency:  string;
  isAdmin:   boolean;
  groupId:   string;
  payerName: string;
}) {
  const [, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState(false);

  const cat = getCategory(expense.category);
  const displayName = expense.customCategory || cat.label;

  function handleDelete() {
    setPendingDelete(true);
    hapticDelete();
    startTransition(async () => {
      const result = await deleteExpense(expense.id, groupId);
      setPendingDelete(false);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to delete");
        return;
      }
      toast.success("Expense removed");
    });
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-opacity ${
      pendingDelete ? "opacity-40" : ""
    } hover:bg-slate-50/80 dark:hover:bg-slate-800/40`}>
      <CategoryIcon category={expense.category} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {expense.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {displayName}
          </span>
          <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {formatDate(expense.expenseDate)}
          </span>
          {expense.isAdvance && (
            <>
              <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide
                               bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400
                               px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-700/50">
                Advanced by {payerName}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
          {formatCurrency(Number(expense.amount), currency)}
        </span>

        {isAdmin && (
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={pendingDelete}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500
                           hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                           transition-colors disabled:opacity-40"
                title="Remove expense"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            }
            title="Remove wallet expense"
            description={`Remove "${expense.description}" from the wallet? This will increase the wallet balance.`}
            confirmLabel="Remove"
            destructive
            onConfirm={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

export function CircleExpenseList({ expenses, members, currency, isAdmin, groupId }: Props) {
  // Build member ID → name map for advance badge
  const memberNameMap = new Map(
    members.map((m) => [m.id, m.displayName ?? m.guestName ?? "Admin"])
  );

  if (expenses.length === 0) return null;

  return (
    <AnimatedList className="divide-y divide-slate-100 dark:divide-slate-800/60">
      {expenses.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          currency={currency}
          isAdmin={isAdmin}
          groupId={groupId}
          payerName={memberNameMap.get(expense.paidByMemberId) ?? "Admin"}
        />
      ))}
    </AnimatedList>
  );
}
