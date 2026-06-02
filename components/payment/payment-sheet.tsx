"use client";

/**
 * PaymentSheet — Composite bottom sheet for Trips/Nests payment flows.
 *
 * Two directions:
 *   debtor   — I owe money → pick payment method → self-report (is_confirmed=false)
 *   creditor — I'm owed money → request payment link → OR confirm receipt
 *
 * Method selector chips: [💸 UPI] [💵 Cash] [🏦 Bank] [💳 Other]
 * UPI pre-selected when payee has a UPI ID; Cash otherwise.
 *
 * Chrome: identical to StreamSettleSheet (spring, createPortal, useSheetDismiss).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod, PaymentParty } from "@/lib/payment/types";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from "@/lib/payment/types";
import { UpiPayButton }          from "@/components/payment/upi-pay-button";
import { UpiRequestButton }      from "@/components/payment/upi-request-button";
import { PaymentConfirmPrompt }  from "@/components/payment/payment-confirm-prompt";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentContext {
  type: "trip" | "nest" | "stream" | "circle";
  id:   string;   // groupId
  name: string;   // group name (used as UPI transaction note)
}

interface PaymentCallbackParams {
  paymentMethod:  PaymentMethod;
  utrReference?:  string;
  note?:          string;
}

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  /** Who is viewing: "debtor" = I owe; "creditor" = I'm owed */
  direction: "debtor" | "creditor";
  amount:    number;
  currency:  string;
  /** The person paying (debtor) */
  payer:     PaymentParty;
  /** The person receiving (creditor) */
  payee:     PaymentParty;
  context:   PaymentContext;
  /**
   * Called by the debtor after they've paid.
   * The parent wraps `selfReportSettlement(groupId, fromMemberId, toMemberId, ...)`.
   */
  onSelfReport: (params: PaymentCallbackParams) => Promise<void>;
  /**
   * Called by the creditor / admin to immediately mark as paid (is_confirmed=true).
   * The parent wraps `recordSettlement(...)`.
   */
  onMarkPaid: (params: PaymentCallbackParams) => Promise<void>;
}

// ── Method chips config ───────────────────────────────────────────────────────

const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "upi",           label: "UPI",      icon: "💸" },
  { value: "cash",          label: "Cash",      icon: "💵" },
  { value: "bank_transfer", label: "Bank",      icon: "🏦" },
  { value: "other",         label: "Other",     icon: "💳" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentSheet({
  isOpen, onClose, direction, amount, currency,
  payer, payee, context,
  onSelfReport, onMarkPaid,
}: Props) {
  const [mounted,    setMounted]    = useState(false);
  const [method,     setMethod]     = useState<PaymentMethod>(
    payee.defaultUpiId ? "upi" : "cash"
  );
  const [utrInput,   setUtrInput]   = useState("");
  const [noteInput,  setNoteInput]  = useState("");
  const [upiTapped,  setUpiTapped]  = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Debtor name to show on the creditor side header
  const payerFirst = payer.name.split(" ")[0];
  const payeeFirst = payee.name.split(" ")[0];

  useEffect(() => setMounted(true), []);
  useSheetDismiss(isOpen, onClose);

  // Reset state on close (delayed so exit animation plays cleanly)
  useEffect(() => {
    if (isOpen) {
      // Re-evaluate default method when sheet opens (payee may have changed)
      setMethod(payee.defaultUpiId ? "upi" : "cash");
    } else {
      const t = setTimeout(() => {
        setUtrInput("");
        setNoteInput("");
        setUpiTapped(false);
        setConfirming(false);
        setSubmitting(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, payee.defaultUpiId]);

  // iOS scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isOpen]);

  // ── Return-from-UPI detection (for debtor path) ────────────────────────────
  const timerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismissPrompt = useCallback(() => {
    setUpiTapped(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current)  clearInterval(tickRef.current);
  }, []);

  const handleUpiTapped = useCallback(() => {
    setUpiTapped(true);
  }, []);

  // ── Self-report (debtor confirms they paid via UPI confirm prompt) ──────────
  async function handleSelfReportUpi(utr?: string) {
    setConfirming(true);
    try {
      await onSelfReport({ paymentMethod: "upi", utrReference: utr || undefined });
      dismissPrompt();
      onClose();
    } finally {
      setConfirming(false);
    }
  }

  // ── Submit for non-UPI debtor methods ─────────────────────────────────────
  async function handleDebtorSubmit() {
    setSubmitting(true);
    try {
      await onSelfReport({
        paymentMethod: method,
        utrReference:  method === "bank_transfer" ? utrInput.trim() || undefined : undefined,
        note:          method !== "bank_transfer" ? noteInput.trim() || undefined : undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Creditor confirms receipt ─────────────────────────────────────────────
  async function handleCreditorSubmit() {
    setSubmitting(true);
    try {
      await onMarkPaid({
        paymentMethod: method,
        utrReference:  method === "upi" || method === "bank_transfer" ? utrInput.trim() || undefined : undefined,
        note:          noteInput.trim() || undefined,
      });
      onClose();
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
                              ${direction === "debtor"
                                ? "bg-cyan-50 dark:bg-cyan-900/30"
                                : "bg-emerald-50 dark:bg-emerald-900/30"}`}>
                {direction === "debtor" ? "💸" : "📥"}
              </div>
              <span
                className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {direction === "debtor"
                  ? `Pay ${payeeFirst}`
                  : `Collect from ${payerFirst}`}
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

              {/* Amount display */}
              <div className="glass rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                  {direction === "debtor"
                    ? `You owe ${payeeFirst}`
                    : `${payerFirst} owes you`}
                </p>
                <p
                  className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  {formatCurrency(amount, currency)}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {context.name}
                </p>
              </div>

              {/* ── CREDITOR PATH ─────────────────────────────────────────── */}
              {direction === "creditor" && (
                <>
                  {/* Request payment via share */}
                  <UpiRequestButton
                    payeeUserId={payee.userId}
                    payeeName={payee.name}
                    amount={amount}
                    currency={currency}
                    contextName={context.name}
                    groupId={context.id}
                    size="md"
                  />

                  {/* "Already received?" divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      or confirm you've received it
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>

                  {/* Method chips */}
                  <MethodChips selected={method} onChange={setMethod} />

                  {/* Creditor method body */}
                  <CreditorMethodBody
                    method={method}
                    payerName={payer.name}
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
                      "Confirm receipt ✓"
                    )}
                  </button>
                </>
              )}

              {/* ── DEBTOR PATH ───────────────────────────────────────────── */}
              {direction === "debtor" && (
                <>
                  {/* Method chips */}
                  <MethodChips selected={method} onChange={setMethod} />

                  {/* UPI path: app picker + return-from-UPI prompt */}
                  {method === "upi" && payee.defaultUpiId && (
                    <div className="space-y-3">
                      <UpiPayButton
                        vpa={payee.defaultUpiId}
                        amount={amount}
                        currency={currency}
                        contextName={context.name}
                        onTapped={handleUpiTapped}
                        size="md"
                      />
                      <PaymentConfirmPrompt
                        isVisible={upiTapped}
                        confirming={confirming}
                        amount={amount}
                        currency={currency}
                        onConfirm={handleSelfReportUpi}
                        onDismiss={dismissPrompt}
                      />
                    </div>
                  )}

                  {/* UPI selected but payee has no VPA */}
                  {method === "upi" && !payee.defaultUpiId && (
                    <div className="glass rounded-xl px-4 py-4 text-center space-y-2">
                      <p className="text-2xl">🔗</p>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {payeeFirst} hasn't added a UPI ID yet
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Try cash or bank transfer, or ask {payeeFirst} to add their UPI ID in Settings.
                      </p>
                    </div>
                  )}

                  {/* Cash path */}
                  {method === "cash" && (
                    <div className="space-y-3">
                      <div className="glass rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Let {payeeFirst} know you've paid in cash. They'll receive a
                          notification to confirm receipt.
                        </p>
                      </div>
                      <OptionalNoteInput value={noteInput} onChange={setNoteInput} />
                      <DebtorSubmitButton submitting={submitting} onClick={handleDebtorSubmit} />
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
                      <OptionalNoteInput value={noteInput} onChange={setNoteInput} />
                      <DebtorSubmitButton submitting={submitting} onClick={handleDebtorSubmit} />
                    </div>
                  )}

                  {/* Other path */}
                  {method === "other" && (
                    <div className="space-y-3">
                      <OptionalNoteInput
                        value={noteInput}
                        onChange={setNoteInput}
                        label="How did you pay?"
                        placeholder='e.g. "Split bill at the restaurant"'
                      />
                      <DebtorSubmitButton submitting={submitting} onClick={handleDebtorSubmit} />
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

function OptionalNoteInput({
  value,
  onChange,
  label = "Note",
  placeholder = 'e.g. "Paid via Google Pay"',
}: {
  value:       string;
  onChange:    (v: string) => void;
  label?:      string;
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
}: {
  submitting: boolean;
  onClick:    () => void;
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
        <><Loader2 className="w-4 h-4 animate-spin" /> Reporting…</>
      ) : (
        "Report payment →"
      )}
    </button>
  );
}

function CreditorMethodBody({
  method,
  payerName,
  utrInput,
  onUtrChange,
  noteInput,
  onNoteChange,
}: {
  method:      PaymentMethod;
  payerName:   string;
  utrInput:    string;
  onUtrChange: (v: string) => void;
  noteInput:   string;
  onNoteChange:(v: string) => void;
}) {
  const payerFirst = payerName.split(" ")[0];

  if (method === "upi") {
    return (
      <div className="space-y-3">
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Confirm you received payment from {payerFirst} via UPI.
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
            Confirm you received a bank transfer from {payerFirst}.
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
    <OptionalNoteInput
      value={noteInput}
      onChange={onNoteChange}
      label={method === "cash" ? "Note" : "How was payment received?"}
      placeholder={method === "cash" ? `e.g. "Received cash from ${payerFirst}"` : "Describe the payment"}
    />
  );
}
