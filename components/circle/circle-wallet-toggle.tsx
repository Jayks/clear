"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateWalletExpensesSetting } from "@/app/actions/circle";
import { hapticLight } from "@/lib/haptics";

interface Props {
  groupId:               string;
  walletExpensesEnabled: boolean;
}

export function CircleWalletToggle({ groupId, walletExpensesEnabled }: Props) {
  const [enabled, setEnabled] = useState(walletExpensesEnabled);
  const [busy,    setBusy]    = useState(false);

  async function handleToggle() {
    if (busy) return;
    hapticLight();
    const next = !enabled;
    setEnabled(next); // optimistic
    setBusy(true);
    const result = await updateWalletExpensesSetting(groupId, next);
    setBusy(false);
    if (!result.ok) {
      setEnabled(!next); // rollback
      toast.error(result.error ?? "Failed to update setting");
    } else {
      toast.success(next ? "Wallet expenses enabled" : "Wallet expenses disabled");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Track wallet expenses
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {enabled
            ? "Admin can log expenses drawn from the wallet"
            : "Disabled — this circle only tracks contributions"}
        </p>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        aria-checked={enabled}
        role="switch"
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors overflow-hidden disabled:opacity-60 ${
          enabled ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}
