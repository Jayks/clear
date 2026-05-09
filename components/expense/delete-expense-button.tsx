"use client";

import { deleteExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

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
          className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 flex items-center justify-center transition-colors"
          aria-label="Delete expense"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      }
    />
  );
}
