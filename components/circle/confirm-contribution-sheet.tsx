"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { hapticSuccess, hapticDelete } from "@/lib/haptics";
import { confirmContributions, rejectContribution } from "@/app/actions/circle";
import { formatCurrency } from "@/lib/utils";

interface Props {
  member: {
    id:             string;
    name:           string;
    userId:         string | null;
    contributionId: string;
    amount:         number;
  };
  currency:    string;
  periodLabel: string | null;
  groupId:     string;
  isOpen:      boolean;
  onClose:     () => void;
  onSuccess:   () => void;
}

export function ConfirmContributionSheet({
  member, currency, periodLabel, groupId, isOpen, onClose, onSuccess,
}: Props) {
  const [mounted,     setMounted]     = useState(false);
  const [confirming,  setConfirming]  = useState(false);
  const [rejecting,   setRejecting]   = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useSheetDismiss(isOpen, onClose);

  async function handleConfirm() {
    setConfirming(true);
    const result = await confirmContributions({
      groupId,
      contributionIds: [member.contributionId],
    });
    setConfirming(false);
    if (result.ok) {
      hapticSuccess();
      toast.success(`Confirmed for ${member.name}`);
      onSuccess();
    } else {
      toast.error(result.error ?? "Failed to confirm");
      onClose();
    }
  }

  async function handleReject() {
    setRejecting(true);
    const result = await rejectContribution({
      groupId,
      contributionId: member.contributionId,
      memberUserId:   member.userId,
    });
    setRejecting(false);
    if (result.ok) {
      hapticDelete();
      toast.success(`Rejected — ${member.name} will be notified`);
      onSuccess();
    } else {
      toast.error(result.error ?? "Failed to reject");
      onClose();
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="ccsheet-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          <motion.div
            key="ccsheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[51]
                       bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                       border-t border-slate-200/80 dark:border-slate-700/60
                       rounded-t-2xl shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h3
                className="text-base text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Confirm payment
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
              {/* Amber self-report badge */}
              <div className="flex items-start gap-3 p-3 rounded-xl
                              bg-amber-50 dark:bg-amber-900/20
                              border border-amber-200/60 dark:border-amber-700/40">
                <span className="text-lg mt-0.5">🟡</span>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {member.name} says they&apos;ve paid
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                    Verify in your UPI notifications before confirming
                  </p>
                </div>
              </div>

              {/* Amount card */}
              <div className="glass rounded-xl p-4 text-center space-y-1">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                  {formatCurrency(member.amount, currency)}
                </p>
                {periodLabel && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">{periodLabel}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejecting || confirming}
                  className="flex-1 py-3 rounded-xl border border-red-200 dark:border-red-800/50
                             text-red-600 dark:text-red-400 text-sm font-medium
                             hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                             disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {rejecting ? "Rejecting…" : <><ThumbsDown className="w-3.5 h-3.5" />Not received</>}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming || rejecting}
                  className="flex-1 py-3 rounded-xl
                             bg-gradient-to-br from-emerald-500 to-green-500
                             hover:from-emerald-600 hover:to-green-600
                             text-white text-sm font-medium
                             shadow-md shadow-emerald-500/20 transition-all
                             disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {confirming ? "Confirming…" : <><Check className="w-4 h-4" />Confirm</>}
                </button>
              </div>

              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
