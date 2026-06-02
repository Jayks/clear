"use client";

/**
 * PaymentConfirmPrompt — Atom 3 (return-from-UPI receipt prompt)
 *
 * Shown after the debtor returns from a UPI app — detected via
 * `document.visibilitychange` + `window.focus` events by the PARENT component.
 *
 * The parent is responsible for:
 *   1. Setting `isVisible=true` when the app regains focus after a UPI deep-link tap
 *   2. Calling `onDismiss` to hide the prompt (also auto-fires after 15s)
 *   3. Passing `onConfirm(utr?)` to record the self-reported payment
 *
 * Design:
 *   - Indigo/violet glass card (matches PaymentPendingBadge colour language)
 *   - Framer Motion height entrance from 0 → auto
 *   - Optional UTR input (max 30 chars)
 *   - 15-second countdown progress bar → auto-dismiss
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface Props {
  isVisible:  boolean;
  onConfirm:  (utr?: string) => Promise<void> | void;
  onDismiss:  () => void;
  /** Pass true while the parent is awaiting the self-report server action */
  confirming?: boolean;
  amount:     number;
  currency:   string;
}

const TIMEOUT_SEC = 15;

export function PaymentConfirmPrompt({
  isVisible, onConfirm, onDismiss, confirming = false, amount, currency,
}: Props) {
  const [utr,     setUtr]     = useState("");
  const [elapsed, setElapsed] = useState(0);

  // ── Countdown timer ───────────────────────────────────────────────────────
  // Two separate timers:
  //   dismissTimer — fires once at TIMEOUT_SEC to call onDismiss()
  //   tickInterval — fires every second to update the visual countdown
  // Keeping them separate avoids calling onDismiss() inside a setState updater
  // (which would trigger the React "update during render" warning).
  useEffect(() => {
    if (!isVisible) {
      setElapsed(0);
      setUtr("");
      return;
    }
    setElapsed(0);
    const dismissTimer = setTimeout(() => onDismiss(), TIMEOUT_SEC * 1000);
    const tickInterval = setInterval(() => {
      setElapsed((e) => Math.min(e + 1, TIMEOUT_SEC));
    }, 1000);
    return () => {
      clearTimeout(dismissTimer);
      clearInterval(tickInterval);
    };
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = Math.max(0, 100 - (elapsed / TIMEOUT_SEC) * 100);

  const currencySymbol = currency === "INR" ? "₹" : currency;

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

              {/* ── Header ─────────────────────────────────────────────── */}
              <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                💸 Payment sent?
              </p>
              <p className="text-xs text-cyan-600/80 dark:text-cyan-400/70">
                Confirm sending {currencySymbol}{amount} via UPI and we'll notify the recipient.
              </p>

              {/* ── Optional UTR input ─────────────────────────────────── */}
              <div>
                <label className="block text-[11px] font-semibold text-cyan-700/80 dark:text-cyan-400/80 mb-1">
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
              </div>

              {/* ── Action buttons ─────────────────────────────────────── */}
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

              {/* ── Countdown progress bar ─────────────────────────────── */}
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

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
