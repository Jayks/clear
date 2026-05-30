"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { hapticLight } from "@/lib/haptics";
import { formatCurrency } from "@/lib/utils";
import { forgiveStream, forgiveAllActiveStreams } from "@/app/actions/stream";

interface Props {
  isOpen:        boolean;
  onClose:       () => void;
  personName:    string;
  /** Pass streamId to forgive a single entry; pass null to forgive ALL active. */
  streamId:      string | null;
  /** For single-entry: the amount being forgiven. For "all": the total net. */
  amount:        number;
  currency:      string;
  note:          string | null;
  /** Required when streamId is null (forgive all). */
  counterpartId?: string;
}

export function StreamForgiveSheet({
  isOpen,
  onClose,
  personName,
  streamId,
  amount,
  currency,
  note,
  counterpartId,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted]     = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);
  useSheetDismiss(isOpen, onClose);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setPrivateNote(""), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // iOS scroll prevention
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isOpen]);

  const firstName  = personName.split(" ")[0];
  const amountStr  = formatCurrency(amount, currency);
  const isForgiveAll = streamId === null;

  async function handleForgive() {
    setSubmitting(true);
    try {
      let result: { ok: boolean; error?: string };

      if (isForgiveAll && counterpartId) {
        result = await forgiveAllActiveStreams(counterpartId, privateNote.trim() || undefined);
      } else if (streamId) {
        result = await forgiveStream(streamId, privateNote.trim() || undefined);
      } else {
        toast.error("Nothing to forgive");
        return;
      }

      if (!result.ok) {
        toast.error(result.error ?? "Failed to forgive");
        return;
      }

      hapticLight();
      onClose();

      toast.success(
        isForgiveAll
          ? `💚 Forgiven — all cleared with ${firstName}`
          : `💚 Forgiven`,
        { duration: 3000 },
      );

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl
                       bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xl shrink-0">💚</span>
              <span
                className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {isForgiveAll ? `Forgive all with ${firstName}?` : `Forgive ${amountStr}?`}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                           text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                           hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-5 space-y-5">
              {/* Context */}
              {!isForgiveAll && note && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  &ldquo;{note}&rdquo;
                </p>
              )}

              {/* Explanation card */}
              <div className="glass-sm rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {firstName} won&apos;t be notified.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isForgiveAll
                    ? `All outstanding debts will quietly disappear from ${firstName}'s view.`
                    : "It'll quietly disappear from their view. You keep the record privately."}
                </p>
              </div>

              {/* Private note */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Private note{" "}
                  <span className="font-normal text-slate-400">
                    (only you see this)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder='e.g. "He was going through a tough time"'
                  value={privateNote}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  maxLength={200}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                             bg-white/60 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100
                             placeholder:text-slate-400 focus:outline-none focus:ring-2
                             focus:ring-emerald-400/50 transition"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 mb-safe">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700
                             text-sm font-medium text-slate-600 dark:text-slate-300
                             hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors
                             disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForgive}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500
                             hover:from-emerald-600 hover:to-teal-600
                             text-white font-semibold transition-all
                             disabled:opacity-50 flex items-center justify-center gap-2
                             shadow-md shadow-emerald-500/20"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Forgiving…</>
                  ) : (
                    "Forgive 💚"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
