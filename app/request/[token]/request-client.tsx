"use client";

/**
 * RequestClient — interactive payment UI for the public /request/[token] page.
 *
 * Handles two main flows:
 *   A. UPI — app picker → return-from-UPI prompt → "I've paid" → selfReport
 *   B. Cash / Bank — method picker → optional UTR → "Confirm payment" → selfReport
 *
 * Flexi circles (amount === null): shows a numeric amount input before the UPI
 * picker; passes paidAmount to selfReportExternalPayment.
 */

import { useState, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { UpiPayButton } from "@/components/payment/upi-pay-button";
import { selfReportExternalPayment } from "@/app/actions/payment-requests";
import { useUpiReturn } from "@/hooks/use-upi-return";
import type { TappedApp } from "@/lib/payment/types";
import { BRAND } from "@/lib/brand";

interface Props {
  token:        string;
  payerName:    string;
  payeeName:    string;
  payeeUpiId:   string | null;
  /** null = Flexi one-time circle; guest must enter the amount they paid */
  amount:       number | null;
  currency:     string;
  description:  string | null;
  groupName:    string;
  contextType:  "circle" | "trip" | "nest";
}

export function RequestClient({
  token, payerName, payeeName, payeeUpiId,
  amount, currency, description, groupName,
}: Props) {
  // UPI flow state
  const [upiTapped,   setUpiTapped]   = useState(false);
  // Alt method (cash / bank)
  const [altMethod,   setAltMethod]   = useState<"cash" | "bank" | null>(null);
  // Flexi amount input
  const [flexiAmount, setFlexiAmount] = useState("");
  // UTR reference (optional, both UPI and alt)
  const [utrRef,      setUtrRef]      = useState("");
  // Copy-UPI feedback
  const [copied,      setCopied]      = useState(false);
  // Self-report submitted successfully
  const [done,        setDone]        = useState(false);
  // Server-action error message
  const [error,       setError]       = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const { timerActive } = useUpiReturn(upiTapped);
  const isWaiting = upiTapped && !timerActive;

  const sym        = currency === "INR" ? "₹" : currency;
  const firstName  = payeeName.split(" ")[0];
  const isFlexiMode = amount === null;

  // ── Submit helper ──────────────────────────────────────────────────────────

  const submit = useCallback(
    (method: "upi" | "cash" | "bank") => {
      if (isFlexiMode) {
        const n = parseFloat(flexiAmount);
        if (!flexiAmount || isNaN(n) || n <= 0) {
          setError("Please enter the amount you paid");
          return;
        }
      }
      setError(null);
      startTransition(async () => {
        const pa     = isFlexiMode ? parseFloat(flexiAmount) : undefined;
        const result = await selfReportExternalPayment(token, method, utrRef || undefined, pa);
        if (result.ok) {
          setDone(true);
        } else {
          setError(result.error);
        }
      });
    },
    [token, isFlexiMode, flexiAmount, utrRef],
  );

  const dismissUpi = useCallback(() => setUpiTapped(false), []);

  const copyVpa = async () => {
    if (!payeeUpiId) return;
    try {
      await navigator.clipboard.writeText(payeeUpiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="text-center py-4 space-y-3">
        <span className="text-4xl block">✅</span>
        <h2
          className="text-xl text-slate-800 dark:text-slate-100"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Got it!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {firstName} will confirm your payment shortly.
        </p>
      </div>
    );
  }

  // ── Active payment UI ──────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Context header ──────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          {groupName}
        </p>

        {!isFlexiMode ? (
          // Fixed amount
          <h2
            className="text-2xl text-slate-800 dark:text-slate-100 leading-snug"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            You owe{" "}
            <span className="text-cyan-600 dark:text-cyan-400">
              {sym}{Number(amount).toLocaleString("en-IN")}
            </span>{" "}
            to {firstName}
          </h2>
        ) : (
          // Flexi — amount input
          <div className="space-y-2">
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">
              How much did you pay?
            </p>
            <div className="flex items-center gap-2 border-b-2 border-slate-200 dark:border-slate-700 focus-within:border-cyan-500 dark:focus-within:border-cyan-400 transition-colors pb-1">
              <span className="text-xl text-slate-400 dark:text-slate-500 font-medium">
                {sym}
              </span>
              <input
                type="number"
                value={flexiAmount}
                onChange={(e) => setFlexiAmount(e.target.value)}
                placeholder="0"
                min="1"
                step="any"
                className="flex-1 text-2xl font-semibold bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded-md
                           text-slate-800 dark:text-slate-100 placeholder:text-slate-300
                           dark:placeholder:text-slate-600"
                aria-label={`Amount in ${currency}`}
              />
            </div>
          </div>
        )}

        {description && (
          <p className="text-sm text-slate-400 dark:text-slate-500">{description}</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* ── UPI section ─────────────────────────────────────────────────── */}
      {payeeUpiId ? (
        <div className="space-y-3">
          {/* App picker: amount=0 for Flexi (UPI deep link; user enters amount in app) */}
          <UpiPayButton
            vpa={payeeUpiId}
            amount={amount ?? 0}
            currency={currency}
            contextName={description ?? groupName}
            onTapped={(app: TappedApp) => { void app; setUpiTapped(true); }}
            size="md"
          />

          {/* UPI ID copy row */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
            <span className="flex-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
              {payeeUpiId}
            </span>
            <button
              type="button"
              onClick={copyVpa}
              aria-label="Copy UPI ID"
              className="shrink-0 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>

          {/* Return-from-UPI confirm prompt */}
          <AnimatePresence>
            {upiTapped && (
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
                  {isWaiting ? (
                    // Still in UPI app
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                        📱 Complete your payment in the app
                      </p>
                      <p className="text-xs text-cyan-600/80 dark:text-cyan-400/70 leading-relaxed">
                        Come back here once you&apos;ve paid to confirm.
                      </p>
                      <button
                        type="button"
                        onClick={dismissUpi}
                        className="text-[11px] text-cyan-500/70 hover:text-cyan-600 transition-colors underline"
                      >
                        Not paying right now
                      </button>
                    </div>
                  ) : (
                    // Returned from UPI app
                    <>
                      <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                        💸 Did you pay?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={dismissUpi}
                          className="flex-1 py-1.5 text-xs font-medium rounded-lg
                                     border border-cyan-200 dark:border-cyan-700/60
                                     text-cyan-600 dark:text-cyan-400
                                     hover:bg-cyan-100/60 dark:hover:bg-cyan-800/30
                                     transition-colors"
                        >
                          Not yet
                        </button>
                        <button
                          type="button"
                          onClick={() => submit("upi")}
                          disabled={isPending}
                          className="flex-1 py-1.5 text-xs font-semibold rounded-lg
                                     bg-gradient-to-br from-cyan-500 to-teal-500
                                     hover:from-cyan-600 hover:to-teal-600
                                     text-white transition-all
                                     flex items-center justify-center
                                     disabled:opacity-60"
                        >
                          {isPending ? "Saving…" : "I've paid →"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        // No UPI ID
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-center">
          <p className="text-2xl">🔗</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {firstName} hasn&apos;t added a UPI ID yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            You can confirm your payment below using cash or bank transfer.
          </p>
        </div>
      )}

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {payeeUpiId ? "or paid differently?" : "confirm payment"}
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* ── Cash / Bank section ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {payeeUpiId ? "Paid in cash or bank?" : "How did you pay?"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "bank"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setAltMethod(altMethod === m ? null : m)}
              className={`py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                altMethod === m
                  ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              {m === "cash" ? "💵 Cash" : "🏦 Bank Transfer"}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {altMethod && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-1">
                <input
                  type="text"
                  value={utrRef}
                  onChange={(e) => setUtrRef(e.target.value)}
                  placeholder="UTR / Ref No. (optional)"
                  maxLength={50}
                  className="w-full px-3 py-2.5 rounded-xl text-sm
                             border border-slate-200 dark:border-slate-700
                             bg-white/60 dark:bg-slate-800/60
                             text-slate-700 dark:text-slate-200
                             placeholder:text-slate-400 dark:placeholder:text-slate-500
                             outline-none focus:border-cyan-400 dark:focus:border-cyan-500
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => submit(altMethod)}
                  disabled={isPending}
                  className="w-full py-3 rounded-xl font-semibold text-sm
                             bg-gradient-to-br from-cyan-500 to-teal-500
                             hover:from-cyan-600 hover:to-teal-600
                             text-white transition-all
                             shadow-sm shadow-cyan-500/25
                             disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Confirm payment"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Soft footer */}
      <p className="text-center text-[11px] text-slate-300 dark:text-slate-600 pt-1">
        Powered by {BRAND.name} — group expense tracking
      </p>
    </div>
  );
}
