"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { CircleReminderSheet } from "./circle-reminder-sheet";

interface Props {
  circleName:   string;
  periodLabel:  string | null;
  paidCount:    number;
  totalCount:   number;
  pendingNames: string[];
  amount:       number | null;
  currency:     string;
  upiId:        string | null;
  joinUrl:      string;
  isOneTime?:   boolean;
}

export function CircleReminderButton({
  circleName, periodLabel, paidCount, totalCount, pendingNames,
  amount, currency, upiId, joinUrl, isOneTime,
}: Props) {
  const [open, setOpen] = useState(false);

  const hoverBorder = isOneTime
    ? "hover:border-amber-300 dark:hover:border-amber-600"
    : "hover:border-indigo-300 dark:hover:border-indigo-600";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-2xl
                   border border-slate-200 dark:border-slate-700
                   text-slate-600 dark:text-slate-300 text-sm font-medium
                   hover:bg-slate-50 dark:hover:bg-slate-800/60
                   ${hoverBorder} transition-all`}
      >
        <Send className="w-4 h-4" />
        Send reminder to {pendingNames.length} ↗
      </button>

      <CircleReminderSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        circleName={circleName}
        periodLabel={periodLabel}
        paidCount={paidCount}
        totalCount={totalCount}
        pendingNames={pendingNames}
        amount={amount}
        currency={currency}
        upiId={upiId}
        joinUrl={joinUrl}
      />
    </>
  );
}
