"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { QuickAddSheet } from "@/components/expense/quick-add-sheet";

interface Props {
  groupId: string;
  groupName: string;
  currency: string;
  groupStartDate?: string | null;
  groupEndDate?: string | null;
}

export function TripCardQuickAdd({
  groupId,
  groupName,
  currency,
  groupStartDate,
  groupEndDate,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Add expense to ${groupName}`}
        title="Quick add expense"
        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <QuickAddSheet
            groupId={groupId}
            groupName={groupName}
            currency={currency}
            groupStartDate={groupStartDate}
            groupEndDate={groupEndDate}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
