"use client";

import { deleteExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { hapticDelete } from "@/lib/haptics";
import { useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  expenseId: string;
  groupId: string;
  onSuccess?: () => void;
  onFail?: () => void;
}

export function DeleteExpenseButton({ expenseId, groupId, onSuccess, onFail }: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDelete() {
    hapticDelete();
    // Optimistically remove from UI immediately
    onSuccess?.();

    // Schedule the actual server delete after 5 s
    timerRef.current = setTimeout(async () => {
      const result = await deleteExpense(expenseId, groupId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to delete expense");
        onFail?.();
      }
    }, 5000);

    toast("Expense deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          onFail?.();
          router.refresh();
        },
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 flex items-center justify-center transition-colors"
      aria-label="Delete expense"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
