"use client";

/**
 * PaymentConfirmPrompt — Atom 3 (return-from-UPI receipt prompt)
 *
 * Two phases controlled by the parent via `timerActive`:
 *
 *   timerActive = false (default for new flows using useUpiReturn):
 *     Shows a "waiting" state — user is still in the UPI app. No countdown.
 *     Copy: "📱 Complete your payment in the app, then come back here"
 *
 *   timerActive = true:
 *     User has returned. Start the 15s countdown. Show UTR input + confirm.
 *
 * Legacy callers that don't pass `timerActive` default to `true` so the old
 * "timer starts on tap" behaviour is preserved (backward compatible).
 *
 * `tappedApp` (optional): shows collapsible app-specific instructions for
 * finding the UTR reference number — significantly increases UTR capture rate.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { TappedApp } from "@/lib/payment/types";

// ── App-specific UTR instructions ─────────────────────────────────────────────

const UTR_TIPS: Record<TappedApp, { where: string; steps: string }> = {
  gpay: {
    where: "G Pay",
    steps: 'Activity → tap "Clear · [trip]" → copy the "Transaction ID" at the bottom',
  },
  phonepe: {
    where: "PhonePe",
    steps: "History → tap the payment → copy the \"Transaction ID\"",
  },
  any_upi: {
    where: "your UPI app",
    steps: "Payment History → tap this transaction → look for \"UTR\" or \"Transaction ID\"",
  },
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  isVisible:  boolean;
  onConfirm:  (utr?: string) => Promise<void> | void;
  onDismiss:  () => void;
  /** Pass true while the parent is awaiting the self-report server action */
  confirming?: boolean;
  amount:     number;
  currency:   string;
  /**
   * Controls when the 15s countdown starts.
   * - false (default for useUpiReturn callers): waiting state shown, no timer
   * - true  (default for legacy callers):       countdown starts immediately
   *
   * Pass `timerActive={returnedFromApp}` where `returnedFromApp` comes from
   * `const { timerActive } = useUpiReturn(upiTapped)`.
   */
  timerActive?: boolean;
  /**
   * Which UPI app was tapped — enables app-specific UTR instructions.
   * Shown as a collapsible tip below the UTR input.
   */
  tappedApp?: TappedApp;
}

const TIMEOUT_SEC = 15;

export function PaymentConfirmPrompt({
  isVisible, onConfirm, onDismiss, confirming = false, amount, currency,
  timerActive = true,   // legacy default — callers that pass nothing keep old behaviour
  tappedApp,
}: Props) {
  const [utr,     setUtr]     = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  // Only runs when BOTH isVisible AND timerActive are true.
  // Two separate timers to avoid calling onDismiss inside a setState updater.
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset visual state whenever the prompt closes OR returns to waiting state
    if (!isVisible || !timerActive) {
      setElapsed(0);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      if (!isVisible) {
        setUtr("");
        setTipOpen(false);
      }
      return;
    }

    // Both isVisible and timerActive: start countdown
    setElapsed(0);
    dismissTimerRef.current = setTimeout(() => onDismiss(), TIMEOUT_SEC * 1000);
    tickIntervalRef.current = setInterval(() => {
      setElapsed((e) => Math.min(e + 1, TIMEOUT_SEC));
    }, 1000);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [isVisible, timerActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct     = Math.max(0, 100 - (elapsed / TIMEOUT_SEC) * 100);
  const currencySymbol  = currency === "INR" ? "₹" : currency;
  const isWaiting       = isVisible && !timerActive;

  const tip = tappedApp ? UTR_TIPS[tappedApp] : null;

  async function handleConfirm() {
    await onConfirm(utr.trim() || undefined);
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="overflow-hidden"
        >
          <div className="pt-1">
            <div className="rounded-xl border bg-cyan-50 dark:bg-cyan-900/20
                            border-cyan-200/60 dark:border-cyan-700/40 p-3 space-y-3">

              {/* ── Waiting state (timerActive=false) ──────────────────── */}
              {isWaiting ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                    📱 Complete your payment in the app
                  </p>
                  <p className="text-xs text-cyan-600/80 dark:text-cyan-400/70">
                    Come back here once you've sent{" "}
                    {currencySymbol}{amount} to confirm.
                  </p>
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="text-[11px] text-cyan-500/70 dark:text-cyan-400/60
                               hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors underline"
                  >
                    Not paying right now
                  </button>
                </div>
              ) : (
                /* ── Active countdown state (timerActive=true) ─────────── */
                <>
                  {/* Header */}
                  <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                    💸 Payment sent?
                  </p>
                  <p className="text-xs text-cyan-600/80 dark:text-cyan-400/70">
                    Confirm sending {currencySymbol}{amount} via UPI and
                    we'll notify the recipient.
                  </p>

                  {/* UTR input */}
                  <div>
                    <label className="block text-[11px] font-semibold
                                      text-cyan-700/80 dark:text-cyan-400/80 mb-1">
                      UTR Reference{" "}
                      <span className="font-normal text-cyan-500/60 dark:text-cyan-400/60">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      maxLength={30}
                      placeholder="12-digit UTR from your UPI receipt — optional"
                      className="w-full px-3 py-2 rounded-lg text-xs
                                 border border-cyan-200 dark:border-cyan-700/60
                                 bg-white/70 dark:bg-cyan-950/30
                                 text-slate-700 dark:text-slate-200
                                 placeholder:text-cyan-400/70 dark:placeholder:text-cyan-600/50
                                 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    />

                    {/* App-specific UTR tip */}
                    {tip && (
                      <div className="mt-1.5">
                        <button
                          type="button"
                          onClick={() => setTipOpen((o) => !o)}
                          className="flex items-center gap-1 text-[11px]
                                     text-cyan-500/70 dark:text-cyan-400/60
                                     hover:text-cyan-600 dark:hover:text-cyan-400
                                     transition-colors"
                        >
                          {tipOpen
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />}
                          Where to find it in {tip.where}
                        </button>
                        <AnimatePresence>
                          {tipOpen && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden text-[11px]
                                         text-cyan-600/70 dark:text-cyan-400/60
                                         mt-1 leading-relaxed"
                            >
                              {tip.steps}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onDismiss}
                      disabled={confirming}
                      className="flex-1 py-1.5 text-xs font-medium rounded-lg
                                 border border-cyan-200 dark:border-cyan-700/60
                                 text-cyan-600 dark:text-cyan-400
                                 hover:bg-cyan-100/60 dark:hover:bg-cyan-800/30
                                 transition-colors disabled:opacity-50"
                    >
                      Not yet
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={confirming}
                      className="flex-1 py-1.5 text-xs font-semibold rounded-lg
                                 bg-gradient-to-br from-cyan-500 to-teal-500
                                 hover:from-cyan-600 hover:to-teal-600
                                 text-white transition-all
                                 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {confirming ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Reporting…</>
                      ) : (
                        "Yes, report it ✓"
                      )}
                    </button>
                  </div>

                  {/* Countdown progress bar */}
                  <div className="h-[3px] rounded-full bg-cyan-100 dark:bg-cyan-800/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-400 dark:bg-cyan-500
                                  transition-[width] duration-1000 ease-linear"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-cyan-500/70 dark:text-cyan-400/50 text-right -mt-1">
                    auto-dismiss in {TIMEOUT_SEC - elapsed}s
                  </p>
                </>
              )}

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
