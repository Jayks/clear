"use client";

/**
 * PayClient — client-side payment UI for the public /pay page.
 *
 * Handles two states:
 *   1. vpa present  → UpiPayButton (app picker + QR) + return-from-UPI prompt
 *   2. vpa absent   → "ask payee to add UPI ID" + WhatsApp remind button
 *
 * The return-from-UPI prompt is a lightweight inline card (not PaymentConfirmPrompt
 * atom) because this public page has no server action to call — confirmation
 * happens back inside the Clear app on the settle page.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { UpiPayButton } from "@/components/payment/upi-pay-button";
import { buildWhatsAppRequestUrl } from "@/lib/payment/utils";

interface Props {
  payeeName:   string;
  /** Payee's default UPI VPA, or null if not set */
  vpa:         string | null;
  amount:      number;
  currency:    string;
  contextName: string;
  /** URL to navigate to after payment confirmation (settle page or /groups) */
  backUrl:     string;
  /** NEXT_PUBLIC_APP_URL — passed from server component to avoid `process.env` in client */
  appUrl:      string;
}

const RETURN_TIMEOUT_SEC = 15;

export function PayClient({ payeeName, vpa, amount, currency, contextName, backUrl, appUrl }: Props) {
  const [tapped,   setTapped]   = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [copiedVpa, setCopied]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Dismiss the return prompt ──────────────────────────────────────────
  const dismiss = useCallback(() => {
    setTapped(false);
    setElapsed(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current)  clearInterval(tickRef.current);
  }, []);

  // ── Called when user taps any UPI app button ────────────────────────
  const handleUpiTapped = useCallback(() => {
    setTapped(true);
    setElapsed(0);
  }, []);

  // ── Detect return from UPI app + run countdown ─────────────────────
  useEffect(() => {
    if (!tapped) return;

    const onReturn = () => {
      // Already tapped; just ensure the prompt stays visible on focus/visibility restore
    };
    const onVisibility = () => { if (document.visibilityState === "visible") onReturn(); };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onReturn);

    timerRef.current = setTimeout(dismiss, RETURN_TIMEOUT_SEC * 1000);
    tickRef.current  = setInterval(() => {
      setElapsed(e => Math.min(e + 1, RETURN_TIMEOUT_SEC));
    }, 1000);

    return () => {
      clearTimeout(timerRef.current!);
      clearInterval(tickRef.current!);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onReturn);
    };
  }, [tapped, dismiss]);

  // ── Copy UPI ID to clipboard ───────────────────────────────────────
  const copyVpa = async () => {
    if (!vpa) return;
    try {
      await navigator.clipboard.writeText(vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore — clipboard unavailable */ }
  };

  const sym         = currency === "INR" ? "₹" : currency;
  const progressPct = Math.max(0, 100 - (elapsed / RETURN_TIMEOUT_SEC) * 100);
  const firstName   = payeeName.split(" ")[0];

  // ── No UPI ID — prompt payee to add one ───────────────────────────
  if (!vpa) {
    const whatsappMsg =
      `Hey ${payeeName}, please add your UPI ID to Clear so I can pay you ` +
      `${sym}${Number(amount).toLocaleString("en-IN")} easily. ` +
      `Settings → Profile → UPI IDs: ${appUrl}/settings`;

    return (
      <div className="glass rounded-2xl p-5 space-y-4 text-center">
        <p className="text-3xl">🔗</p>
        <div className="space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
            {payeeName} hasn't added a UPI ID yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ask them to add it in Clear Settings so you can pay them directly.
          </p>
        </div>
        <a
          href={buildWhatsAppRequestUrl(whatsappMsg)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                     bg-gradient-to-br from-emerald-500 to-teal-500
                     hover:from-emerald-600 hover:to-teal-600
                     text-white text-sm font-semibold transition-all
                     shadow-sm shadow-emerald-500/25"
        >
          <MessageCircle className="w-4 h-4" />
          Remind {firstName} via WhatsApp →
        </a>
      </div>
    );
  }

  // ── Has UPI ID — full payment UI ──────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-5 space-y-4">

        {/* ── App picker + QR ────────────────────────────────────────── */}
        <UpiPayButton
          vpa={vpa}
          amount={amount}
          currency={currency}
          contextName={contextName}
          onTapped={handleUpiTapped}
          size="md"
        />

        {/* ── UPI ID text + copy ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
          <span className="flex-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {vpa}
          </span>
          <button
            type="button"
            onClick={copyVpa}
            aria-label="Copy UPI ID"
            className="shrink-0 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {copiedVpa
              ? <Check className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5 text-slate-400" />
            }
          </button>
        </div>

        {/* ── Return-from-UPI confirm prompt ─────────────────────────── */}
        <AnimatePresence>
          {tapped && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border
                              bg-cyan-50 dark:bg-cyan-900/20
                              border-cyan-200/60 dark:border-cyan-700/40
                              p-3 space-y-3">

                <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                  💸 Did you pay?
                </p>
                <p className="text-xs text-cyan-600/80 dark:text-cyan-400/70 leading-relaxed">
                  Open Clear to confirm your {sym}{Number(amount).toLocaleString("en-IN")}{" "}
                  payment and notify {firstName}.
                </p>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg
                               border border-cyan-200 dark:border-cyan-700/60
                               text-cyan-600 dark:text-cyan-400
                               hover:bg-cyan-100/60 dark:hover:bg-cyan-800/30
                               transition-colors"
                  >
                    Not yet
                  </button>
                  <Link
                    href={backUrl}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg
                               bg-gradient-to-br from-cyan-500 to-teal-500
                               hover:from-cyan-600 hover:to-teal-600
                               text-white transition-all
                               flex items-center justify-center gap-1"
                  >
                    Confirm in Clear
                    <ExternalLink className="w-3 h-3" />
                  </Link>
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
                  auto-dismiss in {RETURN_TIMEOUT_SEC - elapsed}s
                </p>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── "Paid differently?" fallback link ───────────────────────── */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Paid differently?{" "}
        <Link
          href={backUrl}
          className="text-cyan-600 dark:text-cyan-400 underline underline-offset-2 hover:text-cyan-700"
        >
          Open Clear to confirm →
        </Link>
      </p>
    </div>
  );
}
