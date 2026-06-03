"use client";

/**
 * PaymentPendingBadge — Atom 4 (creditor / admin confirmation surface)
 *
 * Shown when a debtor has self-reported a payment but the creditor hasn't
 * confirmed it yet (is_confirmed = false on the settlement row).
 *
 * Two visual states controlled by `canConfirm` prop:
 *
 *   canConfirm = true  (creditor OR admin)
 *     → Shows payer name, amount, method, UTR reference + [✓ Confirm] [✗ Dispute]
 *     → Clicking Dispute opens an inline 2-step reason picker (replaces buttons)
 *     → Reason is passed to onDispute(reason) so it appears in the push notification
 *
 *   canConfirm = false (uninvolved member)
 *     → Shows simple "Awaiting confirmation" message — no action buttons
 *
 * The `canConfirm` value must be pre-computed by the parent:
 *   canConfirm = isAdmin || toMember.userId === currentUser.id
 *
 * onDispute signature change: `(reason: string) => void`
 * Legacy callers that don't handle the reason arg still work — reason is logged
 * in the notification but doesn't require a DB schema change in v1.
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { PaymentMethod } from "@/lib/payment/types";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from "@/lib/payment/types";
import { formatCurrency } from "@/lib/utils";

// ── Dispute reason options ────────────────────────────────────────────────────

const DISPUTE_REASONS = [
  { value: "not_received",     label: "Didn't receive this" },
  { value: "wrong_amount",     label: "Wrong amount"         },
  { value: "already_recorded", label: "Already recorded"     },
  { value: "other",            label: "Other reason"         },
] as const;

type DisputeReason = (typeof DISPUTE_REASONS)[number]["value"];

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  /** Name of the person who self-reported the payment */
  payerName:       string;
  amount:          number;
  currency:        string;
  paymentMethod?:  PaymentMethod;
  utrReference?:   string;
  /** Pre-computed: true for the creditor (toMember) and admins */
  canConfirm:      boolean;
  /** Receives the selected reason string — included in push notification body */
  onConfirm?:      () => Promise<void> | void;
  onDispute?:      (reason: string) => Promise<void> | void;
  /** Pass true while awaiting the confirmSettlement action response */
  confirming?:     boolean;
  /** Pass true while awaiting the disputeSettlement action response */
  disputing?:      boolean;
}

export function PaymentPendingBadge({
  payerName, amount, currency, paymentMethod, utrReference,
  canConfirm, onConfirm, onDispute, confirming = false, disputing = false,
}: Props) {
  const firstName = payerName.split(" ")[0];

  // ── Dispute reason flow ───────────────────────────────────────────────────
  const [showReason,       setShowReason]       = useState(false);
  const [selectedReason,   setSelectedReason]   = useState<DisputeReason | null>(null);

  function handleDisputeClick() {
    setShowReason(true);
    setSelectedReason(null);
  }

  function handleCancelReason() {
    setShowReason(false);
    setSelectedReason(null);
  }

  async function handleConfirmDispute() {
    if (!selectedReason || !onDispute) return;
    const label = DISPUTE_REASONS.find((r) => r.value === selectedReason)?.label ?? "Other";
    await onDispute(label);
  }

  // ── Uninvolved member: read-only ──────────────────────────────────────────
  if (!canConfirm) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                      bg-cyan-50 dark:bg-cyan-900/20
                      border border-cyan-200/60 dark:border-cyan-700/40">
        <span className="text-base shrink-0">⏳</span>
        <div>
          <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
            Awaiting confirmation
          </p>
          <p className="text-[11px] text-cyan-600/70 dark:text-cyan-400/60">
            {firstName} reported paying {formatCurrency(amount, currency)}
          </p>
        </div>
      </div>
    );
  }

  // ── Creditor / admin: actionable ─────────────────────────────────────────
  return (
    <div className="rounded-xl border bg-cyan-50 dark:bg-cyan-900/20
                    border-cyan-200/60 dark:border-cyan-700/40 p-3 space-y-2.5">

      {/* Payment summary */}
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">💸</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
            {firstName} reported paying {formatCurrency(amount, currency)}
          </p>

          {/* Payment method + UTR row */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {paymentMethod && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded
                               bg-cyan-100 dark:bg-cyan-800/40
                               text-cyan-700 dark:text-cyan-300">
                {PAYMENT_METHOD_ICONS[paymentMethod]}{" "}
                {PAYMENT_METHOD_LABELS[paymentMethod]}
              </span>
            )}
            {utrReference && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                UTR {utrReference}
              </span>
            )}
            {!paymentMethod && !utrReference && (
              <span className="text-[10px] text-cyan-500/60 dark:text-cyan-400/50">
                no reference provided
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Step 1: normal confirm/dispute buttons ──────────────────────── */}
      {!showReason && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDisputeClick}
            disabled={disputing || confirming}
            className="flex-1 py-1.5 text-xs font-medium rounded-lg
                       border border-cyan-200 dark:border-cyan-700/60
                       text-cyan-600 dark:text-cyan-400
                       hover:bg-red-50 hover:border-red-200 hover:text-red-600
                       dark:hover:bg-red-900/20 dark:hover:border-red-700/40 dark:hover:text-red-400
                       transition-colors disabled:opacity-50
                       flex items-center justify-center gap-1.5"
          >
            ✗ Dispute
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming || disputing}
            className="flex-1 py-1.5 text-xs font-semibold rounded-lg
                       bg-gradient-to-br from-emerald-500 to-teal-500
                       hover:from-emerald-600 hover:to-teal-600
                       text-white transition-all
                       disabled:opacity-60
                       flex items-center justify-center gap-1.5"
          >
            {confirming ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Confirming…</>
            ) : (
              "✓ Confirm receipt"
            )}
          </button>
        </div>
      )}

      {/* ── Step 2: inline reason picker (replaces button row) ─────────── */}
      {showReason && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
            Why are you disputing?
          </p>

          {/* Reason pills */}
          <div className="flex flex-wrap gap-1.5">
            {DISPUTE_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedReason(r.value)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg
                             border transition-all
                             ${selectedReason === r.value
                               ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700/60 text-red-700 dark:text-red-300"
                               : "bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                             }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Cancel / confirm buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancelReason}
              disabled={disputing}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg
                         border border-slate-200 dark:border-slate-700
                         text-slate-500 dark:text-slate-400
                         hover:bg-slate-50 dark:hover:bg-slate-800/40
                         transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDispute}
              disabled={!selectedReason || disputing}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg
                         bg-gradient-to-br from-red-500 to-rose-500
                         hover:from-red-600 hover:to-rose-600
                         text-white transition-all
                         disabled:opacity-40
                         flex items-center justify-center gap-1.5"
            >
              {disputing ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Disputing…</>
              ) : (
                "Confirm dispute ✗"
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
