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
  member:      PendingMember;
  amount:      number;
  currency:    string;
  period:      string | null;
  periodLabel: string | null;
  groupId:     string;
  isOpen:      boolean;
  onClose:     () => void;
  onSuccess:   () => void;
}

export function RecordContributionSheet({
  member, amount, currency, period, periodLabel, groupId, isOpen, onClose, onSuccess,
}: Props) {
  const [mounted,    setMounted]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useSheetDismiss(isOpen, onClose);

  async function handleConfirm() {
    setSubmitting(true);
    const result = await recordContribution({ groupId, memberId: member.id, amount, period, currency });
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
                Record contribution
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
              {/* Summary card */}
              <div className="glass rounded-xl p-4 text-center space-y-1">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                  {formatCurrency(amount, currency)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  for <span className="font-semibold">{member.name}</span>
                </p>
                {periodLabel && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">{periodLabel}</p>
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
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl
                             bg-gradient-to-br from-violet-500 to-purple-600
                             hover:from-violet-600 hover:to-purple-700
                             text-white text-sm font-medium
                             shadow-md shadow-violet-500/20 transition-all
                             disabled:opacity-60 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
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
