"use client";

/**
 * PaymentSheet — Composite bottom sheet for Trips/Nests payment flows.
 *
 * Two directions:
 *   debtor   — I owe money → pick payment method → self-report (is_confirmed=false)
 *   creditor — I'm owed money → request payment link → OR confirm receipt
 *
 * Improvements in this version:
 *   #1 — Timer bug: uses useUpiReturn so the 15s countdown only starts after
 *        the user returns from the UPI app (not immediately on button tap).
 *   #2 — Partial amount: debtor can edit the amount down to pay partially.
 *        Included in onSelfReport / onMarkPaid PaymentCallbackParams.
 *   #4 — tappedApp: passed to PaymentConfirmPrompt for app-specific UTR tips.
 *
 * Chrome: identical to StreamSettleSheet (spring, createPortal, useSheetDismiss).
 */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Pencil } from "lucide-react";
import { useSheetDismiss }      from "@/hooks/use-sheet-dismiss";
import { useUpiReturn }         from "@/hooks/use-upi-return";
import { formatCurrency }       from "@/lib/utils";
import { toast }                from "sonner";
import type { PaymentMethod, PaymentParty, TappedApp } from "@/lib/payment/types";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from "@/lib/payment/types";
import { UpiPayButton }          from "@/components/payment/upi-pay-button";
import { UpiRequestButton }      from "@/components/payment/upi-request-button";
import { PaymentConfirmPrompt }  from "@/components/payment/payment-confirm-prompt";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PaymentContext {
  type: "trip" | "nest" | "stream" | "circle";
  id:   string;
  name: string;
}

export interface PaymentCallbackParams {
  paymentMethod:  PaymentMethod;
  utrReference?:  string;
  note?:          string;
  /**
   * Actual amount being paid/reported — may differ from the suggestion when
   * the debtor edits the amount for a partial settlement.
   * Parents should use this over the suggestion amount if provided.
   */
  amount?:        number;
}

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  /** Who is viewing: "debtor" = I owe; "creditor" = I'm owed */
  direction: "debtor" | "creditor";
  amount:    number;
  currency:  string;
  payer:     PaymentParty;
  payee:     PaymentParty;
  context:   PaymentContext;
  onSelfReport: (params: PaymentCallbackParams) => Promise<void>;
  onMarkPaid:   (params: PaymentCallbackParams) => Promise<void>;
}

// ── Method chips config ────────────────────────────────────────────────────────

const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "upi",           label: "UPI",   icon: "💸" },
  { value: "cash",          label: "Cash",  icon: "💵" },
  { value: "bank_transfer", label: "Bank",  icon: "🏦" },
  { value: "other",         label: "Other", icon: "💳" },
];

// ── Component ──────────────────────────────────────────────────────────────────

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
  const [tappedApp,  setTappedApp]  = useState<TappedApp | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── #2 Partial amount (debtor only) ──────────────────────────────────────
  const [payAmountStr, setPayAmountStr] = useState(String(amount));
  const [editingAmount, setEditingAmount] = useState(false);

  const parsedPayAmount = parseFloat(payAmountStr) || amount;
  const isPartial       = direction === "debtor" && parsedPayAmount < amount - 0.01;

  function handleAmountChange(v: string) {
    const cleaned = v.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");
    setPayAmountStr(cleaned);
  }

  // ── #1 Return-from-UPI timer (useUpiReturn) ───────────────────────────────
  const { timerActive } = useUpiReturn(upiTapped);

  const payerFirst = payer.name.split(" ")[0];
  const payeeFirst = payee.name.split(" ")[0];

  useEffect(() => setMounted(true), []);
  useSheetDismiss(isOpen, onClose);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setMethod(payee.defaultUpiId ? "upi" : "cash");
      setPayAmountStr(String(amount));
      setEditingAmount(false);
    } else {
      const t = setTimeout(() => {
        setUtrInput("");
        setNoteInput("");
        setUpiTapped(false);
        setTappedApp(undefined);
        setConfirming(false);
        setSubmitting(false);
        setEditingAmount(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, payee.defaultUpiId, amount]);

  // iOS scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isOpen]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const dismissPrompt = useCallback(() => {
    setUpiTapped(false);
    setTappedApp(undefined);
  }, []);

  // #4: called when any UPI button is tapped — records which app
  const handleUpiTapped = useCallback((app: TappedApp) => {
    setTappedApp(app);
    setUpiTapped(true);
  }, []);

  async function handleSelfReportUpi(utr?: string) {
    setConfirming(true);
    try {
      await onSelfReport({
        paymentMethod: "upi",
        utrReference:  utr || undefined,
        amount:        parsedPayAmount,
      });
      dismissPrompt();
      onClose();
    } catch (err) {
      console.error("selfReport (UPI) error:", err);
      toast.error("Couldn't report payment — check your connection and try again.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleDebtorSubmit() {
    setSubmitting(true);
    try {
      await onSelfReport({
        paymentMethod: method,
        utrReference:  method === "bank_transfer" ? utrInput.trim() || undefined : undefined,
        note:          method !== "bank_transfer"  ? noteInput.trim() || undefined : undefined,
        amount:        parsedPayAmount,
      });
      onClose();
    } catch (err) {
      console.error("debtorSubmit error:", err);
      toast.error("Couldn't record payment — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreditorSubmit() {
    setSubmitting(true);
    try {
      await onMarkPaid({
        paymentMethod: method,
        utrReference:  method === "upi" || method === "bank_transfer"
          ? utrInput.trim() || undefined
          : undefined,
        note:          noteInput.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error("creditorSubmit error:", err);
      toast.error("Couldn't mark as received — check your connection and try again.");
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

                {/* ── #2 Debtor: tappable amount that becomes editable ── */}
                {direction === "debtor" && !editingAmount && (
                  <button
                    type="button"
                    onClick={() => setEditingAmount(true)}
                    className="group inline-flex items-center gap-1.5 mx-auto"
                    title="Edit amount"
                  >
                    <span
                      className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
                      style={{ fontFamily: "var(--font-fraunces)" }}
                    >
                      {formatCurrency(parsedPayAmount, currency)}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500
                                       group-hover:text-cyan-500 dark:group-hover:text-cyan-400
                                       transition-colors shrink-0" />
                  </button>
                )}

                {direction === "debtor" && editingAmount && (
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-slate-400 text-sm">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={payAmountStr}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      onBlur={() => setEditingAmount(false)}
                      className="w-32 text-center text-2xl font-bold tabular-nums
                                 text-emerald-600 dark:text-emerald-400 bg-transparent
                                 border-b-2 border-cyan-400 focus:outline-none"
                      style={{ fontFamily: "var(--font-fraunces)" }}
                    />
                  </div>
                )}

                {/* Creditor: fixed amount, non-editable */}
                {direction === "creditor" && (
                  <p
                    className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {formatCurrency(amount, currency)}
                  </p>
                )}

                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {context.name}
                </p>

                {/* Partial hint */}
                {isPartial && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    Partial — {formatCurrency(amount - parsedPayAmount, currency)} still remaining
                    {" "}
                    <button
                      type="button"
                      onClick={() => setPayAmountStr(String(amount))}
                      className="underline text-cyan-600 dark:text-cyan-400"
                    >
                      Pay full
                    </button>
                  </p>
                )}
              </div>

              {/* ── CREDITOR PATH ──────────────────────────────────────────── */}
              {direction === "creditor" && (
                <>
                  <UpiRequestButton
                    payeeUserId={payee.userId}
                    payeeName={payee.name}
                    amount={amount}
                    currency={currency}
                    contextName={context.name}
                    groupId={context.id}
                    size="md"
                  />

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      or confirm you've received it
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>

                  <MethodChips selected={method} onChange={setMethod} />
                  <CreditorMethodBody
                    method={method}
                    payerName={payer.name}
                    utrInput={utrInput}
                    onUtrChange={setUtrInput}
                    noteInput={noteInput}
                    onNoteChange={setNoteInput}
                  />

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
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording…</>
                      : "Confirm receipt ✓"}
                  </button>
                </>
              )}

              {/* ── DEBTOR PATH ────────────────────────────────────────────── */}
              {direction === "debtor" && (
                <>
                  <MethodChips selected={method} onChange={setMethod} />

                  {/* UPI + VPA available */}
                  {method === "upi" && payee.defaultUpiId && (
                    <div className="space-y-3">
                      <UpiPayButton
                        vpa={payee.defaultUpiId}
                        amount={parsedPayAmount}
                        currency={currency}
                        contextName={context.name}
                        onTapped={handleUpiTapped}
                        size="md"
                      />
                      <PaymentConfirmPrompt
                        isVisible={upiTapped}
                        timerActive={timerActive}
                        tappedApp={tappedApp}
                        confirming={confirming}
                        amount={parsedPayAmount}
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

                  {/* Cash */}
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

                  {/* Bank transfer */}
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

                  {/* Other */}
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function MethodChips({
  selected, onChange,
}: { selected: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
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
  value, onChange, label = "Note", placeholder = 'e.g. "Paid via Google Pay"',
}: { value: string; onChange: (v: string) => void; label?: string; placeholder?: string }) {
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

function DebtorSubmitButton({ submitting, onClick }: { submitting: boolean; onClick: () => void }) {
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
      {submitting
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Reporting…</>
        : "Report payment →"}
    </button>
  );
}

function CreditorMethodBody({
  method, payerName, utrInput, onUtrChange, noteInput, onNoteChange,
}: {
  method: PaymentMethod; payerName: string;
  utrInput: string; onUtrChange: (v: string) => void;
  noteInput: string; onNoteChange: (v: string) => void;
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

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
        {method === "cash" ? "Note" : "How was payment received?"}{" "}
        <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <input
        type="text"
        value={noteInput}
        onChange={(e) => onNoteChange(e.target.value)}
        maxLength={200}
        placeholder={method === "cash"
          ? `e.g. "Received cash from ${payerFirst}"`
          : "Describe the payment"}
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
