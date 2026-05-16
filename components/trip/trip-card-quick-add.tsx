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
        data-tour="trip-card-add-btn"
        className="w-10 h-10 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-white bg-black/30 hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/20 active:scale-95 transition-all"
      >
        <Plus className="w-5 h-5 md:w-4 md:h-4" />
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
