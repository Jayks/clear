"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { raiseQuestion, cancelMyDispute } from "@/app/actions/interactions";

interface Props {
  expenseId: string;
  groupId: string;
  expenseDescription: string;
  /** Pass the existing pendingDispute id if the user already has an open question */
  existingDisputeId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_LENGTH = 280;

export function QuestionForm({ expenseId, groupId, expenseDescription, existingDisputeId, isOpen, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setMounted(true); }, []);

  // Reset on close
  useEffect(() => { if (!isOpen) setMessage(""); }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    startTransition(async () => {
      const result = await raiseQuestion(expenseId, groupId, message.trim());
      if (result.ok) {
        toast.success("Question sent to the payer.");
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error ?? "Failed to send question.");
      }
    });
  }

  function handleCancel() {
    if (!existingDisputeId) return;
    startTransition(async () => {
      const result = await cancelMyDispute(expenseId, groupId);
      if (result.ok) {
        toast.success("Question withdrawn.");
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
            className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  ❓ Ask a question
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[220px]">
                  {expenseDescription}
                </p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                  Your question
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                  placeholder="e.g. Did this include my share? I paid separately for part of it."
                  rows={3}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
                <p className="text-right text-[10px] text-slate-400 mt-1">
                  {message.length}/{MAX_LENGTH}
                </p>
              </div>

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
                  disabled={!message.trim() || isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send question
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
