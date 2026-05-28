"use client";

import { deleteExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { hapticDelete } from "@/lib/haptics";

interface Props {
  expenseId: string;
  groupId: string;
  onSuccess?: () => void;
  onFail?: () => void;
}

export function DeleteExpenseButton({ expenseId, groupId, onSuccess, onFail }: Props) {
  async function handleDelete() {
    const result = await deleteExpense(expenseId, groupId);
    if (!result.ok) {
      toast.error(result.error);
      onFail?.();
    } else {
      hapticDelete();
      onSuccess?.();
    }
  }

  return (
    <ConfirmDialog
      title="Delete expense"
      description="This expense and all its splits will be permanently removed. This cannot be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={handleDelete}
      trigger={
        <button
          type="button"
          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 flex items-center justify-center transition-colors"
          aria-label="Delete expense"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      }
    />
  );
}
