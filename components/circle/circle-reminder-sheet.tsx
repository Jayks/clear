"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Copy, Check, MessageCircle } from "lucide-react";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";

interface Props {
  isOpen:       boolean;
  onClose:      () => void;
  circleName:   string;
  periodLabel:  string | null;
  paidCount:    number;
  totalCount:   number;
  pendingNames: string[];
  amount:       number | null;
  currency:     string;
  upiId:        string | null;
  joinUrl:      string;
}

function makeProgressBar(paidCount: number, total: number): string {
  const filled = Math.round((paidCount / Math.max(total, 1)) * 8);
  return "█".repeat(filled) + "░".repeat(8 - filled);
}

export function CircleReminderSheet({
  isOpen, onClose, circleName, periodLabel, paidCount, totalCount,
  pendingNames, amount, currency, upiId, joinUrl,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useSheetDismiss(isOpen, onClose);

  // Build the reminder message
  const bar = makeProgressBar(paidCount, totalCount);
  const amtStr = amount
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
    : "";
  const periodStr = periodLabel ? `${periodLabel}: ` : "";
  const pendingStr = pendingNames.length <= 4
    ? pendingNames.join(", ")
    : `${pendingNames.slice(0, 3).join(", ")} (+${pendingNames.length - 3} more)`;

  const upiLine = upiId && amount
    ? `\nPay ${amtStr} → upi://pay?pa=${upiId}&am=${amount}&cu=${currency}&tn=${encodeURIComponent(circleName)}`
    : "";

  const message = [
    `Hey team! ${circleName}`,
    `${periodStr}${paidCount}/${totalCount} paid so far ${bar}`,
    "",
    pendingNames.length > 0 ? `Still pending: ${pendingStr}` : "Everyone has paid 🎉",
    upiLine,
    `Track it → ${joinUrl}`,
  ].filter(Boolean).join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="reminder-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            key="reminder-sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[51]
                       bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                       border-t border-slate-200/80 dark:border-slate-700/60
                       rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
                Send reminder
              </h3>
              <button type="button" onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message preview */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700
                              bg-slate-50/80 dark:bg-slate-800/60
                              text-sm text-slate-700 dark:text-slate-200
                              whitespace-pre-wrap leading-relaxed font-sans">
                {message}
              </pre>
            </div>

            {/* Actions */}
            <div className="px-5 pb-6 space-y-2 shrink-0">
              <button type="button" onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                           bg-[#25D366] hover:bg-[#1DB954] text-white font-medium text-sm
                           shadow-md shadow-green-500/20 transition-all">
                <MessageCircle className="w-4 h-4" />
                Share via WhatsApp ↗
              </button>
              <button type="button" onClick={handleCopy}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                           border border-slate-200 dark:border-slate-700
                           text-slate-600 dark:text-slate-300 font-medium text-sm
                           hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy message"}
              </button>
              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
