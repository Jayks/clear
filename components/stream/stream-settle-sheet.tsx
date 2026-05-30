"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { hapticSuccess } from "@/lib/haptics";
import { formatCurrency } from "@/lib/utils";
import { settleWithPerson, undoSettleWithPerson } from "@/app/actions/stream";

interface Props {
  isOpen:       boolean;
  onClose:      () => void;
  personName:   string;
  counterpartId: string;
  net:          number;    // positive = they owe viewer; absolute value shown
  currency:     string;
}

export function StreamSettleSheet({
  isOpen,
  onClose,
  personName,
  counterpartId,
  net,
  currency,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted]       = useState(false);
  const [note, setNote]             = useState("");
  const [amountStr, setAmountStr]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);
  useSheetDismiss(isOpen, onClose);

  // Reset on close / populate default amount on open
  useEffect(() => {
    if (isOpen) {
      setAmountStr(String(Math.abs(net)));
    } else {
      const t = setTimeout(() => { setNote(""); setAmountStr(""); }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, net]);

  // iOS scroll prevention
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isOpen]);

  const firstName  = personName.split(" ")[0];
  const absNet     = Math.abs(net);
  const theyOweMe  = net > 0;
  const fullStr    = formatCurrency(absNet, currency);

  const parsedAmount  = parseFloat(amountStr) || absNet;
  const isPartial     = parsedAmount < absNet - 0.01;
  const amountDisplay = formatCurrency(parsedAmount, currency);

  function handleAmountChange(v: string) {
    const cleaned = v.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");
    setAmountStr(cleaned);
  }

  async function handleSettle() {
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }

    setSubmitting(true);
    try {
      const result = await settleWithPerson(counterpartId, note.trim() || undefined, isPartial ? amount : undefined);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      hapticSuccess();
      onClose();

      const settledIds = result.settledIds;

      toast.success(
        isPartial
          ? `Settled ${amountDisplay} with ${firstName}`
          : `🎉 All square with ${firstName}!`,
        {
          duration: 5000,
          action: {
            label: "Undo",
            onClick: async () => {
              const undo = await undoSettleWithPerson(settledIds);
              if (undo.ok) {
                toast.success("Settlement reversed");
                router.refresh();
              } else {
                toast.error("Couldn't undo");
              }
            },
          },
        },
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
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30
                              flex items-center justify-center shrink-0">
                <span className="text-sm">✓</span>
              </div>
              <span
                className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Settle with {firstName}
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
              {/* Balance summary + amount input */}
              <div className="glass rounded-xl px-4 py-4 space-y-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {theyOweMe ? `${firstName} owes you` : `You owe ${firstName}`}
                  </p>
                  <p
                    className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {fullStr}
                  </p>
                </div>

                {/* Editable amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Amount to settle
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                                  border border-slate-200 dark:border-slate-700
                                  bg-white/60 dark:bg-slate-800/60">
                    <span className="text-slate-400 text-sm shrink-0">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100
                                 focus:outline-none tabular-nums"
                    />
                    {isPartial && (
                      <button
                        type="button"
                        onClick={() => setAmountStr(String(absNet))}
                        className="text-[10px] text-indigo-500 dark:text-indigo-400 hover:underline shrink-0"
                      >
                        Full
                      </button>
                    )}
                  </div>
                  {isPartial && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                      Partial payment — oldest entries settled first
                    </p>
                  )}
                </div>
              </div>

              {/* Optional note */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Note <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder='e.g. "Paid via GPay"'
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                             bg-white/60 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100
                             placeholder:text-slate-400 focus:outline-none focus:ring-2
                             focus:ring-emerald-400/50 transition"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSettle}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500
                           hover:from-emerald-600 hover:to-teal-600
                           text-white font-semibold transition-all
                           disabled:opacity-50 flex items-center justify-center gap-2
                           shadow-md shadow-emerald-500/20 mb-safe"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Settling…</>
                ) : isPartial ? (
                  `Settle ${amountDisplay} →`
                ) : (
                  "Mark as Settled ✓"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
