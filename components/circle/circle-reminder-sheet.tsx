"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Copy, Check, MessageCircle } from "lucide-react";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  buildCircleReminderMessage,
  buildPersonalRequestMessage,
} from "@/lib/payment-requests/whatsapp";

interface Props {
  isOpen:            boolean;
  onClose:           () => void;
  circleName:        string;
  periodLabel:       string | null;
  paidCount:         number;
  totalCount:        number;
  /** Ghost members with generated payment tokens */
  pendingGhosts:     { name: string; token: string }[];
  /** Clear-account members who haven't paid (they use the app) */
  pendingClearNames: string[];
  amount:            number | null;
  currency:          string;
  upiId:             string | null;
  joinUrl:           string;
}

export function CircleReminderSheet({
  isOpen, onClose, circleName, periodLabel, paidCount, totalCount,
  pendingGhosts, pendingClearNames, amount, currency, upiId, joinUrl,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useSheetDismiss(isOpen, onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, panelRef);

  // Derive the app base URL from the join URL (e.g. "https://clear.app")
  const appUrl = (() => {
    try {
      const u = new URL(joinUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "";
    }
  })();

  // Group-level reminder message (includes per-ghost payment links)
  const groupMessage = buildCircleReminderMessage({
    circleName,
    periodLabel,
    paidCount,
    totalCount,
    pendingMembers:    pendingGhosts,
    pendingClearNames,
    amount,
    currency,
    joinUrl,
    appUrl,
  });

  function handleCopy() {
    navigator.clipboard.writeText(groupMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(groupMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  /** Open WhatsApp with a personal 1-to-1 message for a single ghost. */
  function handlePersonalWhatsApp(ghost: { name: string; token: string }) {
    const personalMsg = buildPersonalRequestMessage({
      payerName:   ghost.name,
      circleName,
      periodLabel,
      amount,
      currency,
      requestUrl:  `${appUrl}/request/${ghost.token}`,
      upiId,
    });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(personalMsg)}`,
      "_blank",
      "noopener,noreferrer",
    );
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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Send reminder"
            tabIndex={-1}
            style={{ outline: "none" }}
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
              <h3
                className="text-base text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Send reminder
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Group message preview */}
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wide">
                  Group message
                </p>
                <pre
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700
                             bg-slate-50/80 dark:bg-slate-800/60
                             text-sm text-slate-700 dark:text-slate-200
                             whitespace-pre-wrap leading-relaxed font-sans"
                >
                  {groupMessage}
                </pre>
              </div>

              {/* Per-person WhatsApp buttons for ghosts */}
              {pendingGhosts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wide">
                    Send directly to each person
                  </p>
                  <div className="space-y-2">
                    {pendingGhosts.map((ghost) => (
                      <button
                        key={ghost.token}
                        type="button"
                        onClick={() => handlePersonalWhatsApp(ghost)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl
                                   border border-slate-200 dark:border-slate-700
                                   text-slate-700 dark:text-slate-200 text-sm font-medium
                                   hover:bg-slate-50 dark:hover:bg-slate-800/60
                                   transition-colors text-left"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                        <span className="flex-1 truncate">Message {ghost.name}</span>
                        <span className="text-slate-400 text-xs shrink-0">↗</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 pb-6 space-y-2 shrink-0 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                           bg-[#25D366] hover:bg-[#1DB954] text-white font-medium text-sm
                           shadow-md shadow-green-500/20 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Share group message ↗
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                           border border-slate-200 dark:border-slate-700
                           text-slate-600 dark:text-slate-300 font-medium text-sm
                           hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
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
