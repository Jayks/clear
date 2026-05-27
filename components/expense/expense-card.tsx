import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { ExpenseInteractionCount } from "@/lib/db/queries/interactions";
import { CategoryIcon } from "./category-icon";
import { formatCurrency, formatDate, getMemberName } from "@/lib/utils";
import { DeleteExpenseButton } from "./delete-expense-button";
import { DuplicateExpenseButton } from "./duplicate-expense-button";
import Link from "next/link";
import { Pencil } from "lucide-react";

interface ExpenseCardProps {
  expense: Expense;
  members: GroupMember[];
  currentUserId: string;
  currentMemberId?: string;
  isAdmin: boolean;
  onDelete?: (expenseId: string) => void;
  onDeleteFail?: (expenseId: string) => void;
  interactionCount?: ExpenseInteractionCount;
  /** Mobile: hide action buttons — they live in the swipe overlay instead */
  hideActions?: boolean;
  /** Desktop: reveal action buttons on parent group-hover instead of always-on */
  hoverRevealActions?: boolean;
}

export function ExpenseCard({ expense, members, currentUserId, currentMemberId, isAdmin, onDelete, onDeleteFail, interactionCount, hideActions = false, hoverRevealActions = false }: ExpenseCardProps) {
  const payer = members.find((m) => m.id === expense.paidByMemberId);
  const payerName = payer ? getMemberName(payer) : "Member";
  const isPayer = !!currentMemberId && expense.paidByMemberId === currentMemberId;
  const creator = members.find((m) => m.userId === expense.createdByUserId);
  const creatorName = creator ? getMemberName(creator) : null;
  const wasEdited = !!expense.updatedByUserId && expense.updatedByUserId !== expense.createdByUserId;
  const editor = wasEdited ? members.find((m) => m.userId === expense.updatedByUserId) : null;
  const canEdit = expense.createdByUserId === currentUserId || isAdmin;
  const dateDisplay =
    expense.category === "accommodation" && expense.endDate
      ? `${formatDate(expense.expenseDate)} – ${formatDate(expense.endDate)}`
      : formatDate(expense.expenseDate);

  return (
    <div className="glass rounded-xl px-4 py-3 flex flex-col gap-1">
      {/* Single row: icon + content + amount (always visible) */}
      <div className="flex items-center gap-3">
        <CategoryIcon category={expense.category} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{expense.description}</p>
          {expense.category === "other" && expense.customCategory && (
            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium leading-none">
              {expense.customCategory}
            </span>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {payerName} · {dateDisplay}
          </p>
          {/* Interaction signal pills */}
          {interactionCount && (interactionCount.hasUnread || interactionCount.pendingDispute || interactionCount.commentCount > 0) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {interactionCount.pendingDispute && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none ${
                  interactionCount.pendingDispute.type === "question"
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800"
                }`}>
                  {interactionCount.pendingDispute.type === "question" ? "❓" : "⚠️"}
                  {" "}
                  {interactionCount.pendingDispute.requestedByMe
                    ? "Pending"
                    : interactionCount.pendingDispute.type === "question"
                    ? "Question"
                    : "Dispute"}
                </span>
              )}
              {interactionCount.commentCount > 0 && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none border ${
                  interactionCount.hasUnread
                    ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800 font-normal"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-semibold"
                }`}>
                  💬 {interactionCount.commentCount}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Amount — emerald when current user paid, neutral otherwise */}
        <p className={`text-base font-semibold tabular shrink-0 ${isPayer ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"}`} style={{ fontFamily: "var(--font-fraunces)" }}>
          {formatCurrency(Number(expense.amount), expense.currency)}
        </p>
      </div>

      {/* Audit + action row — audit always visible when creator known; buttons only for editors */}
      {(creatorName || canEdit) && (
        <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Left: who added (and edited) — compact metadata */}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate min-w-0">
            {creatorName && (
              <>
                Added by {creatorName}
                {wasEdited && (editor ? ` · edited by ${getMemberName(editor)}` : " · edited")}
              </>
            )}
          </p>
          {/* Right: action buttons */}
          {canEdit && !hideActions && (
            <div className={`flex items-center gap-1.5 shrink-0 ${hoverRevealActions ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""}`}>
              <Link
                href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center justify-center transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
              <DuplicateExpenseButton expenseId={expense.id} />
              <DeleteExpenseButton
                expenseId={expense.id}
                groupId={expense.groupId}
                onSuccess={() => onDelete?.(expense.id)}
                onFail={() => onDeleteFail?.(expense.id)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
