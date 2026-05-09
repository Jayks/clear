import type { Expense } from "@/lib/db/schema/expenses";
import type { TripMember } from "@/lib/db/schema/trip-members";
import { CategoryIcon } from "./category-icon";
import { formatCurrency, formatDate, getMemberName } from "@/lib/utils";
import { DeleteExpenseButton } from "./delete-expense-button";
import { DuplicateExpenseButton } from "./duplicate-expense-button";
import Link from "next/link";
import { Pencil } from "lucide-react";

interface ExpenseCardProps {
  expense: Expense;
  members: TripMember[];
  currentUserId: string;
  isAdmin: boolean;
  onDelete?: (expenseId: string) => void;
  onDeleteFail?: (expenseId: string) => void;
}

export function ExpenseCard({ expense, members, currentUserId, isAdmin, onDelete, onDeleteFail }: ExpenseCardProps) {
  const payer = members.find((m) => m.id === expense.paidByMemberId);
  const payerName = payer ? getMemberName(payer) : "Member";
  const canEdit = expense.createdByUserId === currentUserId || isAdmin;
  const dateDisplay =
    expense.category === "accommodation" && expense.endDate
      ? `${formatDate(expense.expenseDate)} – ${formatDate(expense.endDate)}`
      : formatDate(expense.expenseDate);

  return (
    <div className="glass rounded-xl px-4 py-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      {/* Top row: icon + description + payer */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <CategoryIcon category={expense.category} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{expense.description}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {payerName} · {dateDisplay}
          </p>
        </div>
        {/* Amount shown inline with description on desktop */}
        <p className="hidden sm:block text-base font-semibold text-slate-800 dark:text-slate-100 tabular shrink-0" style={{ fontFamily: "var(--font-fraunces)" }}>
          {formatCurrency(Number(expense.amount), expense.currency)}
        </p>
      </div>

      {/* Bottom row on mobile: amount on left, actions on right */}
      <div className="flex items-center gap-2 sm:gap-2 pl-9 sm:pl-0">
        <p className="sm:hidden text-base font-semibold text-slate-800 dark:text-slate-100 tabular mr-auto" style={{ fontFamily: "var(--font-fraunces)" }}>
          {formatCurrency(Number(expense.amount), expense.currency)}
        </p>
        {canEdit && (
          <>
            <Link
              href={`/trips/${expense.tripId}/expenses/${expense.id}/edit`}
              className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center justify-center transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Link>
            <DuplicateExpenseButton expenseId={expense.id} />
            <DeleteExpenseButton
              expenseId={expense.id}
              tripId={expense.tripId}
              onSuccess={() => onDelete?.(expense.id)}
              onFail={() => onDeleteFail?.(expense.id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
