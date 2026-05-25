"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { raiseDispute, cancelMyDispute } from "@/app/actions/interactions";
import type { DisputeType } from "@/lib/db/schema/expense-disputes";

interface Props {
  expenseId: string;
  groupId: string;
  expenseDescription: string;
  expenseAmount: number;
  currency: string;
  /** Pass if user already has a pending dispute to allow withdrawal */
  existingDisputeId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ActionableType = "remove_me" | "change_share" | "split_equal" | "other";

const DISPUTE_OPTIONS: { type: ActionableType; label: string; description: string; emoji: string }[] = [
  {
    type: "remove_me",
    label: "Remove me",
    description: "I wasn't part of this expense. Remove me from the split.",
    emoji: "🚫",
  },
  {
    type: "change_share",
    label: "Change my share",
    description: "My share should be a different amount.",
    emoji: "✏️",
  },
  {
    type: "split_equal",
    label: "Split equally",
    description: "This should be split equally among everyone.",
    emoji: "⚖️",
  },
  {
    type: "other",
    label: "Other",
    description: "Something else is wrong. I'll explain.",
    emoji: "💬",
  },
];

export function DisputeForm({
  expenseId,
  groupId,
  expenseDescription,
  expenseAmount,
  currency,
  existingDisputeId,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<ActionableType | null>(null);
  const [suggestedAmount, setSuggestedAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setMounted(true); }, []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelected(null);
      setSuggestedAmount("");
      setMessage("");
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const isAmountRequired = selected === "change_share";
  const isMessageRequired = selected === "other";
  const isMessageOptional = selected === "remove_me" || selected === "split_equal";

  const canSubmit = (() => {
    if (!selected) return false;
    if (isAmountRequired) {
      const v = parseFloat(suggestedAmount);
      if (isNaN(v) || v < 0 || v > expenseAmount) return false;
    }
    if (isMessageRequired && !message.trim()) return false;
    return true;
  })();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !canSubmit) return;

    const amount = selected === "change_share" ? parseFloat(suggestedAmount) : undefined;
    const msg = message.trim() || undefined;

    startTransition(async () => {
      const result = await raiseDispute(expenseId, groupId, selected as DisputeType, amount, msg);
      if (result.ok) {
        toast.success("Dispute raised. The payer will be notified.");
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error ?? "Failed to raise dispute.");
      }
    });
  }

  function handleCancel() {
    if (!existingDisputeId) return;
    startTransition(async () => {
      const result = await cancelMyDispute(expenseId, groupId);
      if (result.ok) {
        toast.success("Dispute withdrawn.");
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error ?? "Failed to withdraw.");
      }
    });
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  ⚠️ Raise a dispute
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[220px]">
                  {expenseDescription}
                </p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Options */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    What&apos;s the issue?
                  </p>
                  {DISPUTE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setSelected(opt.type)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        selected === opt.type
                          ? "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <span className="text-xl shrink-0">{opt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          selected === opt.type
                            ? "text-red-700 dark:text-red-300"
                            : "text-slate-700 dark:text-slate-200"
                        }`}>{opt.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                      {selected === opt.type && (
                        <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Change share — amount input */}
                {selected === "change_share" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                      My share should be
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">
                        {currency}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={expenseAmount}
                        step={0.01}
                        value={suggestedAmount}
                        onChange={(e) => setSuggestedAmount(e.target.value)}
                        placeholder={`0 – ${expenseAmount}`}
                        autoFocus
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Expense total: {currency} {expenseAmount.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Message — required for "other", optional for remove/equal */}
                {(isMessageRequired || isMessageOptional) && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                      {isMessageRequired ? "Explain your dispute" : "Note (optional)"}
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                      placeholder={
                        isMessageRequired
                          ? "Describe the issue in detail…"
                          : "Any additional context…"
                      }
                      rows={3}
                      autoFocus={selected === "other"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    />
                    <p className="text-right text-[10px] text-slate-400 mt-1">{message.length}/500</p>
                  </div>
                )}

                {/* Payer accepts / auto-resolve info */}
                {selected && selected !== "other" && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5">
                    💡 The payer can accept this with one tap to automatically update the split. No back-and-forth needed.
                  </p>
                )}

                {/* Footer actions */}
                <div className="flex gap-2 pb-6">
                  {existingDisputeId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                      Withdraw
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit || isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Raise dispute
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
