"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
        className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-sm shadow-cyan-500/25 active:scale-95 transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        Add
      </button>
      <QuickAddSheet
        groupId={groupId}
        groupName={groupName}
        currency={currency}
        isOpen={open}
        groupStartDate={groupStartDate}
        groupEndDate={groupEndDate}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
