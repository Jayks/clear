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
 *     → Shows payer name, amount, method, UTR reference + [✓ Confirm] [✗ Dispute] buttons
 *
 *   canConfirm = false (uninvolved member)
 *     → Shows simple "Awaiting confirmation" message — no action buttons
 *
 * The `canConfirm` value must be pre-computed by the parent:
 *   canConfirm = isAdmin || toMember.userId === currentUser.id
 */

import { Loader2 } from "lucide-react";
import type { PaymentMethod } from "@/lib/payment/types";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from "@/lib/payment/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  /** Name of the person who self-reported the payment */
  payerName:       string;
  amount:          number;
  currency:        string;
  paymentMethod?:  PaymentMethod;
  utrReference?:   string;
  /** Pre-computed: true for the creditor (toMember) and admins */
  canConfirm:      boolean;
  onConfirm?:      () => Promise<void> | void;
  onDispute?:      () => Promise<void> | void;
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

  if (!canConfirm) {
    // ── Uninvolved member: read-only state ─────────────────────────────────
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

  // ── Creditor / admin: actionable state ──────────────────────────────────
  return (
    <div className="rounded-xl border bg-cyan-50 dark:bg-cyan-900/20
                    border-cyan-200/60 dark:border-cyan-700/40 p-3 space-y-2.5">

      {/* ── Payment summary ─────────────────────────────────────────── */}
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

      {/* ── Action buttons ───────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDispute}
          disabled={disputing || confirming}
          className="flex-1 py-1.5 text-xs font-medium rounded-lg
                     border border-cyan-200 dark:border-cyan-700/60
                     text-cyan-600 dark:text-cyan-400
                     hover:bg-red-50 hover:border-red-200 hover:text-red-600
                     dark:hover:bg-red-900/20 dark:hover:border-red-700/40 dark:hover:text-red-400
                     transition-colors disabled:opacity-50
                     flex items-center justify-center gap-1.5"
        >
          {disputing ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Disputing…</>
          ) : (
            "✗ Dispute"
          )}
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

    </div>
  );
}
