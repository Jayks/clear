"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { CategoryIcon } from "@/components/expense/category-icon";
import { DeleteExpenseButton } from "@/components/expense/delete-expense-button";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
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
  onDelete,
  onDeleteFail,
}: {
  expense:      Expense;
  currency:     string;
  isAdmin:      boolean;
  groupId:      string;
  payerName:    string;
  onDelete:     (id: string) => void;
  onDeleteFail: (id: string) => void;
}) {
  const cat = getCategory(expense.category);
  const displayName = expense.customCategory || cat.label;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
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
          <DeleteExpenseButton
            expenseId={expense.id}
            groupId={groupId}
            onSuccess={() => onDelete(expense.id)}
            onFail={() => onDeleteFail(expense.id)}
          />
        )}
      </div>
    </div>
  );
}

export function CircleExpenseList({ expenses, members, currency, isAdmin, groupId }: Props) {
  // Optimistic removal — DeleteExpenseButton fires onSuccess immediately and only
  // commits the server delete after a 5s undo window (matches trip/nest deletes).
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const handleDelete = (id: string) =>
    setRemovedIds((prev) => new Set(prev).add(id));
  const handleDeleteFail = (id: string) =>
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  // Build member ID → name map for advance badge
  const memberNameMap = new Map(
    members.map((m) => [m.id, m.displayName ?? m.guestName ?? "Admin"])
  );

  const visible = expenses.filter((e) => !removedIds.has(e.id));
  if (visible.length === 0) return null;

  return (
    <AnimatedList className="divide-y divide-slate-100 dark:divide-slate-800/60">
      {visible.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          currency={currency}
          isAdmin={isAdmin}
          groupId={groupId}
          payerName={memberNameMap.get(expense.paidByMemberId) ?? "Admin"}
          onDelete={handleDelete}
          onDeleteFail={handleDeleteFail}
        />
      ))}
    </AnimatedList>
  );
}
