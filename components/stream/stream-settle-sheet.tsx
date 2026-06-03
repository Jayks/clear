"use client";

/**
 * StreamSettleSheet — Direction-aware settlement bottom sheet for Streams.
 *
 * Two directions (derived from `net`):
 *   net < 0  → DEBTOR  — I owe money → pay via UPI app picker or report another method
 *   net > 0  → CREDITOR — I'm owed → send payment request link OR confirm I received
 *
 * Chrome: createPortal + AnimatePresence spring + useSheetDismiss (same as PaymentSheet).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { useUpiReturn }    from "@/hooks/use-upi-return";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod, TappedApp } from "@/lib/payment/types";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from "@/lib/payment/types";
import { UpiPayButton }         from "@/components/payment/upi-pay-button";
import { UpiRequestButton }     from "@/components/payment/upi-request-button";
import { PaymentConfirmPrompt } from "@/components/payment/payment-confirm-prompt";

// ── Method chips ──────────────────────────────────────────────────────────────

const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "upi",           label: "UPI",   icon: "💸" },
  { value: "cash",          label: "Cash",  icon: "💵" },
  { value: "bank_transfer", label: "Bank",  icon: "🏦" },
  { value: "other",         label: "Other", icon: "💳" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface PaymentCallbackParams {
  paymentMethod: PaymentMethod;
  utrReference?: string;
  amount:        number;
  note?:         string;
}

interface Props {
  isOpen:       boolean;
  onClose:      () => void;
  personName:   string;
  /** Used for UpiRequestButton payeeUserId when current user is creditor */
  currentUserId: string;
  /**
   * Clear userId of counterpart — needed for UpiRequestButton share URL.
   * Also used to distinguish Clear-user counterpart (self-report flow) from
   * guest counterpart (direct settle flow — guests can't confirm).
   */
  counterpartUserId?: string;
  counterpartId: string;
  /** Counterpart's default UPI VPA — needed by UpiPayButton (debtor path) */
  counterpartDefaultVpa: string | null;
  /** net > 0 = they owe me (creditor); net < 0 = I owe them (debtor) */
  net:          number;
  currency:     string;
  /**
   * Debtor path (Clear-user counterpart only): reports payment (is_confirmed=false).
   * Parent calls selfReportStreamSettle. Returns true on success.
   */
  onSelfReport: (params: PaymentCallbackParams) => Promise<boolean>;
  /**
   * Creditor path OR guest debtor path: marks as settled directly.
   * Parent calls settleWithPerson. Returns true on success.
   */
  onMarkPaid:   (params: PaymentCallbackParams) => Promise<boolean>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StreamSettleSheet({
  isOpen, onClose,
  personName, currentUserId, counterpartUserId, counterpartId,
  counterpartDefaultVpa,
  net, currency,
  onSelfReport, onMarkPaid,
}: Props) {
  const [mounted,    setMounted]    = useState(false);
  const [amountStr,  setAmountStr]  = useState("");
  const [method,     setMethod]     = useState<PaymentMethod>(
    counterpartDefaultVpa ? "upi" : "cash",
  );
  const [utrInput,   setUtrInput]   = useState("");
  const [noteInput,  setNoteInput]  = useState("");
  const [upiTapped,  setUpiTapped]  = useState(false);
  const [tappedApp,  setTappedApp]  = useState<TappedApp | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // #1 Timer bug fix: start countdown only after user returns from UPI app
  const { timerActive } = useUpiReturn(upiTapped);

  const absNet    = Math.abs(net);
  const isCreditor = net > 0;      // they owe me
  const firstName  = personName.split(" ")[0];

  useEffect(() => setMounted(true), []);
  useSheetDismiss(isOpen, onClose);

  // Populate amount + re-evaluate default method on open
  useEffect(() => {
    if (isOpen) {
      setAmountStr(String(absNet));
      setMethod(counterpartDefaultVpa ? "upi" : "cash");
    } else {
      const t = setTimeout(() => {
        setAmountStr("");
        setUtrInput("");
        setNoteInput("");
        setUpiTapped(false);
        setTappedApp(undefined);
        setConfirming(false);
        setSubmitting(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, absNet, counterpartDefaultVpa]);

  // iOS scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isOpen]);

  // ── Editable amount helpers ────────────────────────────────────────────────
  function handleAmountChange(v: string) {
    const cleaned = v.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");
    setAmountStr(cleaned);
  }

  const parsedAmount = parseFloat(amountStr) || absNet;
  const isPartial    = parsedAmount < absNet - 0.01;

  // ── Return-from-UPI detection ──────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismissPrompt = useCallback(() => {
    setUpiTapped(false);
    setTappedApp(undefined);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current)  clearInterval(tickRef.current);
  }, []);

  // #4: receive which app was tapped for app-specific UTR tips
  const handleUpiTapped = useCallback((app: TappedApp) => {
    setTappedApp(app);
    setUpiTapped(true);
  }, []);

  // Whether this is a guest counterpart (no Clear account — can't confirm payments)
  const isGuestCounterpart = !counterpartUserId;

  // ── Debtor: confirm via UPI prompt ────────────────────────────────────────
  async function handleSelfReportUpi(utr?: string) {
    setConfirming(true);
    try {
      const ok = await onSelfReport({ paymentMethod: "upi", utrReference: utr, amount: parsedAmount });
      if (ok) { dismissPrompt(); onClose(); }
    } finally {
      setConfirming(false);
    }
  }

  // ── Debtor: non-UPI submit ────────────────────────────────────────────────
  // For Clear-user counterparts: self-report (is_confirmed=false, they confirm)
  // For guest counterparts: settle directly (no confirmation possible)
  async function handleDebtorSubmit() {
    if (!parsedAmount || parsedAmount <= 0) return;
    setSubmitting(true);
    const params: PaymentCallbackParams = {
      paymentMethod: method,
      utrReference:  method === "bank_transfer" ? utrInput.trim() || undefined : undefined,
      note:          method !== "bank_transfer" ? noteInput.trim() || undefined : undefined,
      amount:        parsedAmount,
    };
    try {
      const ok = isGuestCounterpart
        ? await onMarkPaid(params)   // guests: settle directly
        : await onSelfReport(params); // Clear users: self-report, awaits confirmation
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Creditor: mark received ───────────────────────────────────────────────
  async function handleCreditorSubmit() {
    if (!parsedAmount || parsedAmount <= 0) return;
    setSubmitting(true);
    try {
      const ok = await onMarkPaid({
        paymentMethod: method,
        utrReference:  (method === "upi" || method === "bank_transfer")
          ? utrInput.trim() || undefined
          : undefined,
        note:          noteInput.trim() || undefined,
        amount:        parsedAmount,
      });
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl
                       bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl
                       max-h-[90vh] flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm
                               ${isCreditor
                                 ? "bg-emerald-50 dark:bg-emerald-900/30"
                                 : "bg-cyan-50 dark:bg-cyan-900/30"}`}>
                {isCreditor ? "📥" : "💸"}
              </div>
              <span
                className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {isCreditor ? `Collect from ${firstName}` : `Pay ${firstName}`}
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

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

              {/* ── Balance summary + editable amount ─────────────────────── */}
              <div className="glass rounded-xl px-4 py-4 space-y-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {isCreditor ? `${firstName} owes you` : `You owe ${firstName}`}
                  </p>
                  <p
                    className={`text-3xl font-bold tabular-nums
                                ${isCreditor
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"}`}
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {formatCurrency(absNet, currency)}
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

              {/* ── CREDITOR PATH ─────────────────────────────────────────── */}
              {isCreditor && (
                <>
                  {/* Share a payment request link */}
                  {counterpartUserId && (
                    <UpiRequestButton
                      payeeUserId={currentUserId}
                      payeeName={personName}
                      amount={parsedAmount}
                      currency={currency}
                      contextName={firstName}
                      size="md"
                    />
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      or confirm you've received it
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>

                  {/* Method chips */}
                  <MethodChips selected={method} onChange={setMethod} />

                  {/* Creditor body */}
                  <CreditorBody
                    method={method}
                    payerName={firstName}
                    utrInput={utrInput}
                    onUtrChange={setUtrInput}
                    noteInput={noteInput}
                    onNoteChange={setNoteInput}
                  />

                  {/* Submit */}
                  <button
                    type="button"
                    onClick={handleCreditorSubmit}
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl
                               bg-gradient-to-br from-emerald-500 to-teal-500
                               hover:from-emerald-600 hover:to-teal-600
                               text-white font-semibold transition-all
                               disabled:opacity-50 flex items-center justify-center gap-2
                               shadow-md shadow-emerald-500/20 mb-safe"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Recording…</>
                    ) : (
                      `Confirm receipt ✓`
                    )}
                  </button>
                </>
              )}

              {/* ── DEBTOR PATH ───────────────────────────────────────────── */}
              {!isCreditor && (
                <>
                  {/* Method chips */}
                  <MethodChips selected={method} onChange={setMethod} />

                  {/* UPI path */}
                  {method === "upi" && counterpartDefaultVpa && (
                    <div className="space-y-3">
                      <UpiPayButton
                        vpa={counterpartDefaultVpa}
                        amount={parsedAmount}
                        currency={currency}
                        contextName={firstName}
                        onTapped={handleUpiTapped}
                        size="md"
                      />
                      <PaymentConfirmPrompt
                        isVisible={upiTapped}
                        timerActive={timerActive}
                        tappedApp={tappedApp}
                        confirming={confirming}
                        amount={parsedAmount}
                        currency={currency}
                        onConfirm={handleSelfReportUpi}
                        onDismiss={dismissPrompt}
                      />
                    </div>
                  )}

                  {/* UPI selected but no VPA */}
                  {method === "upi" && !counterpartDefaultVpa && (
                    <div className="glass rounded-xl px-4 py-4 text-center space-y-2">
                      <p className="text-2xl">🔗</p>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {firstName} hasn&apos;t added a UPI ID yet
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Try cash or bank transfer, or ask {firstName} to add their UPI ID in Settings.
                      </p>
                    </div>
                  )}

                  {/* Cash path */}
                  {method === "cash" && (
                    <div className="space-y-3">
                      <div className="glass rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {isGuestCounterpart
                            ? `Mark this balance as settled in cash.`
                            : `Let ${firstName} know you've paid in cash. They'll receive a notification to confirm receipt.`}
                        </p>
                      </div>
                      <NoteInput value={noteInput} onChange={setNoteInput} />
                      <DebtorSubmitButton
                        submitting={submitting}
                        onClick={handleDebtorSubmit}
                        label={isGuestCounterpart ? "Mark as paid →" : "Report payment →"}
                      />
                    </div>
                  )}

                  {/* Bank transfer path */}
                  {method === "bank_transfer" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                          NEFT/IMPS Reference{" "}
                          <span className="font-normal text-slate-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={utrInput}
                          onChange={(e) => setUtrInput(e.target.value)}
                          maxLength={30}
                          placeholder="Transaction reference number"
                          className="w-full px-3 py-2.5 rounded-xl
                                     border border-slate-200 dark:border-slate-700
                                     bg-white/60 dark:bg-slate-800/60
                                     text-sm text-slate-800 dark:text-slate-100
                                     placeholder:text-slate-400 focus:outline-none
                                     focus:ring-2 focus:ring-cyan-400/50 transition"
                        />
                      </div>
                      <NoteInput value={noteInput} onChange={setNoteInput} />
                      <DebtorSubmitButton
                        submitting={submitting}
                        onClick={handleDebtorSubmit}
                        label={isGuestCounterpart ? "Mark as paid →" : "Report payment →"}
                      />
                    </div>
                  )}

                  {/* Other path */}
                  {method === "other" && (
                    <div className="space-y-3">
                      <NoteInput
                        value={noteInput}
                        onChange={setNoteInput}
                        label="How did you pay?"
                        placeholder='e.g. "Paid at the restaurant"'
                      />
                      <DebtorSubmitButton
                        submitting={submitting}
                        onClick={handleDebtorSubmit}
                        label={isGuestCounterpart ? "Mark as paid →" : "Report payment →"}
                      />
                    </div>
                  )}
                </>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MethodChips({
  selected,
  onChange,
}: {
  selected: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  return (
    <div className="flex gap-2">
      {METHODS.map(({ value, label, icon }) => {
        const isActive = selected === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl
                        border text-[11px] font-semibold transition-all
                        ${isActive
                          ? "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300"
                          : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NoteInput({
  value,
  onChange,
  label = "Note",
  placeholder = 'e.g. "Paid via Google Pay"',
}: {
  value:        string;
  onChange:     (v: string) => void;
  label?:       string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
        {label}{" "}
        <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl
                   border border-slate-200 dark:border-slate-700
                   bg-white/60 dark:bg-slate-800/60
                   text-sm text-slate-800 dark:text-slate-100
                   placeholder:text-slate-400 focus:outline-none
                   focus:ring-2 focus:ring-cyan-400/50 transition"
      />
    </div>
  );
}

function DebtorSubmitButton({
  submitting,
  onClick,
  label = "Report payment →",
}: {
  submitting: boolean;
  onClick:    () => void;
  label?:     string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="w-full py-3.5 rounded-xl
                 bg-gradient-to-br from-cyan-500 to-teal-500
                 hover:from-cyan-600 hover:to-teal-600
                 text-white font-semibold transition-all
                 disabled:opacity-50 flex items-center justify-center gap-2
                 shadow-md shadow-cyan-500/20 mb-safe"
    >
      {submitting ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
      ) : (
        label
      )}
    </button>
  );
}

function CreditorBody({
  method,
  payerName,
  utrInput,
  onUtrChange,
  noteInput,
  onNoteChange,
}: {
  method:       PaymentMethod;
  payerName:    string;
  utrInput:     string;
  onUtrChange:  (v: string) => void;
  noteInput:    string;
  onNoteChange: (v: string) => void;
}) {
  if (method === "upi") {
    return (
      <div className="space-y-3">
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Confirm you received payment from {payerName} via UPI.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            UTR Reference{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={utrInput}
            onChange={(e) => onUtrChange(e.target.value)}
            maxLength={30}
            placeholder="12-digit UTR from UPI receipt — optional"
            className="w-full px-3 py-2.5 rounded-xl
                       border border-slate-200 dark:border-slate-700
                       bg-white/60 dark:bg-slate-800/60
                       text-sm text-slate-800 dark:text-slate-100
                       placeholder:text-slate-400 focus:outline-none
                       focus:ring-2 focus:ring-cyan-400/50 transition"
          />
        </div>
      </div>
    );
  }

  if (method === "bank_transfer") {
    return (
      <div className="space-y-3">
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Confirm you received a bank transfer from {payerName}.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Reference{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={utrInput}
            onChange={(e) => onUtrChange(e.target.value)}
            maxLength={30}
            placeholder="NEFT/IMPS transaction reference"
            className="w-full px-3 py-2.5 rounded-xl
                       border border-slate-200 dark:border-slate-700
                       bg-white/60 dark:bg-slate-800/60
                       text-sm text-slate-800 dark:text-slate-100
                       placeholder:text-slate-400 focus:outline-none
                       focus:ring-2 focus:ring-cyan-400/50 transition"
          />
        </div>
      </div>
    );
  }

  // Cash / Other
  return (
    <NoteInput
      value={noteInput}
      onChange={onNoteChange}
      label={method === "cash" ? "Note" : "How was payment received?"}
      placeholder={method === "cash" ? `e.g. "Received cash from ${payerName}"` : "Describe the payment"}
    />
  );
}
