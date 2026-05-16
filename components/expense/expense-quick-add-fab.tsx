"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { QuickAddSheet } from "./quick-add-sheet";

interface Props {
  groupId: string;
  groupName: string;
  currency: string;
  members: GroupMember[];
  groupStartDate?: string | null;
  groupEndDate?: string | null;
}

export function ExpenseQuickAddFab({
  groupId,
  groupName,
  currency,
  members,
  groupStartDate,
  groupEndDate,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-nav-safe right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/40 flex items-center justify-center"
        aria-label="Add expense"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
      <QuickAddSheet
        groupId={groupId}
        groupName={groupName}
        currency={currency}
        isOpen={open}
        members={members}
        groupStartDate={groupStartDate}
        groupEndDate={groupEndDate}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
