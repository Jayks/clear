"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { hapticSuccess } from "@/lib/haptics";
import { recordContribution } from "@/app/actions/circle";
import { formatCurrency } from "@/lib/utils";
import type { PendingMember } from "@/lib/db/queries/circle";

interface Props {
  member:        PendingMember;
  amount:        number;
  currency:      string;
  period:        string | null;
  periodLabel:   string | null;
  groupId:       string;
  isAdditional?: boolean;   // true when recording on top of an existing confirmed contribution
  isOneTime?:    boolean;   // controls button/accent colour
  isOpen:        boolean;
  onClose:       () => void;
  onSuccess:     () => void;
}

export function RecordContributionSheet({
  member, amount, currency, period, periodLabel, groupId, isAdditional, isOneTime, isOpen, onClose, onSuccess,
}: Props) {
  // Mode-aware colour tokens
  const amountTextCls = isOneTime
    ? "text-amber-600 dark:text-amber-400"
    : "text-indigo-600 dark:text-indigo-400";
  const inputFocusCls = isOneTime
    ? "focus:ring-amber-500/20 focus:border-amber-400 dark:focus:border-amber-600"
    : "focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-600";
  const btnGradient = isOneTime
    ? "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20"
    : "from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/20";
  const [mounted,      setMounted]      = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  // Used when no fixed amount is set (amount === 0) — admin enters custom amount
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => { setMounted(true); }, []);
  useSheetDismiss(isOpen, onClose);

  // Resolve final amount: use prop if fixed, otherwise parse custom input
  const hasFixedAmount = amount > 0;
  const finalAmount    = hasFixedAmount ? amount : parseFloat(customAmount) || 0;
  const canSubmit      = finalAmount > 0 && !submitting;

  async function handleConfirm() {
    if (!canSubmit) return;
    setSubmitting(true);
    const result = await recordContribution({ groupId, memberId: member.id, amount: finalAmount, period, currency });
    setSubmitting(false);

    if (result.ok) {
      hapticSuccess();
      toast.success(`Recorded for ${member.name}`);
      onSuccess();
    } else {
      toast.error(result.error ?? "Failed to record");
      onClose();
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="rcsheet-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            key="rcsheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[51]
                       bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                       border-t border-slate-200/80 dark:border-slate-700/60
                       rounded-t-2xl shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h3
                className="text-base text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {isAdditional ? "Additional contribution" : "Record contribution"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center
                           text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-6 space-y-4">
              {/* Summary card — fixed amount display OR custom amount input */}
              <div className="glass rounded-xl p-4 space-y-3">
                {hasFixedAmount ? (
                  <div className="text-center space-y-1">
                    <p className={`text-2xl font-bold tabular-nums ${amountTextCls}`}>
                      {formatCurrency(amount, currency)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      for <span className="font-semibold">{member.name}</span>
                    </p>
                    {periodLabel && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">{periodLabel}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                      Recording contribution for <span className="font-semibold">{member.name}</span>
                    </p>
                    {periodLabel && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">{periodLabel}</p>
                    )}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                        {currency === "INR" ? "₹" : currency}
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        autoFocus
                        className="w-full pl-7 pr-3 py-2.5 text-sm rounded-xl border
                                   border-slate-200 dark:border-slate-700
                                   bg-white/60 dark:bg-slate-800/60
                                   text-slate-800 dark:text-slate-100
                                   placeholder:text-slate-400 dark:placeholder:text-slate-500
                                   focus:outline-none focus:ring-2 ${inputFocusCls} transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700
                             text-slate-600 dark:text-slate-300 text-sm font-medium
                             hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  className={`flex-1 py-3 rounded-xl
                             bg-gradient-to-br ${btnGradient}
                             text-white text-sm font-medium
                             shadow-md transition-all
                             disabled:opacity-40 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2`}
                >
                  {submitting
                    ? "Recording…"
                    : <><Check className="w-4 h-4" />Confirm</>}
                </button>
              </div>

              {/* Safe-area spacer */}
              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
