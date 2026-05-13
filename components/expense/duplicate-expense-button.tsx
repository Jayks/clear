"use client";

import { duplicateExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { useState } from "react";

export function DuplicateExpenseButton({ expenseId }: { expenseId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);
    const result = await duplicateExpense(expenseId);
    setLoading(false);
    if (!result.ok) toast.error(result.error);
    else toast.success("Expense duplicated — dated today.");
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="w-11 h-11 sm:w-7 sm:h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors disabled:opacity-50"
      aria-label="Duplicate expense"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
}
