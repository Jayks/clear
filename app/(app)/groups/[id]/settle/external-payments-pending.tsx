"use client";

/**
 * ExternalPaymentsPending — section showing ghost-member self-reported payments
 * on the Trip/Nest settle page.
 *
 * Rendered when a ghost debtor has tapped "I've paid" on their /request/[token]
 * page. Mirrors the style of PendingConfirmations but calls confirmExternalPayment
 * / disputeExternalPayment instead of confirmSettlement / disputeSettlement.
 *
 * Optimistic removal: rows disappear immediately on confirm/dispute — no waiting
 * for the RSC refresh. router.refresh() still runs in the background to sync
 * balance numbers. Rolls back on server error.
 *
 * canConfirm = isAdmin || payeeUserId === currentUserId
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { PaymentPendingBadge } from "@/components/payment/payment-pending-badge";
import { confirmExternalPayment, disputeExternalPayment } from "@/app/actions/payment-requests";
import { hapticSuccess } from "@/lib/haptics";
import type { PaymentRequest } from "@/lib/db/schema/payment-requests";
import type { PaymentMethod } from "@/lib/payment/types";

interface Props {
  requests:      PaymentRequest[];
  groupId:       string;
  currentUserId: string | undefined;
  isAdmin:       boolean;
  currency:      string;
  /** Called immediately before the confirm server action — lets parent hide the
   *  matching suggestion card optimistically. */
  onConfirmOptimistic?: (req: PaymentRequest) => void;
  /** Called if the confirm server action fails — lets parent restore the card. */
  onConfirmRollback?:   (req: PaymentRequest) => void;
}

export function ExternalPaymentsPending({
  requests, groupId, currentUserId, isAdmin, currency,
  onConfirmOptimistic, onConfirmRollback,
}: Props) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [disputingId,  setDisputingId]  = useState<string | null>(null);
  // Optimistic removal — rows disappear instantly; rolled back if server errors.
  const [removedIds,   setRemovedIds]   = useState<Set<string>>(new Set());

  const visible = requests.filter((r) => !removedIds.has(r.id));
  if (visible.length === 0) return null;

  async function handleConfirm(req: PaymentRequest) {
    setConfirmingId(req.id);
    // Optimistically remove this row and hide the matching suggestion card
    setRemovedIds((prev) => new Set([...prev, req.id]));
    onConfirmOptimistic?.(req);
    try {
      const result = await confirmExternalPayment(req.id, groupId);
      if (!result.ok) {
        // Roll back both this row and the suggestion card
        setRemovedIds((prev) => { const s = new Set(prev); s.delete(req.id); return s; });
        onConfirmRollback?.(req);
        toast.error(result.error);
        return;
      }
      hapticSuccess();
      toast.success("Payment confirmed ✓");
      router.refresh(); // syncs balance numbers in background
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleDispute(requestId: string, payerName: string) {
    setDisputingId(requestId);
    // Optimistically remove row
    setRemovedIds((prev) => new Set([...prev, requestId]));
    try {
      const result = await disputeExternalPayment(requestId, groupId);
      if (!result.ok) {
        // Roll back
        setRemovedIds((prev) => { const s = new Set(prev); s.delete(requestId); return s; });
        toast.error(result.error);
        return;
      }
      toast.success(`Payment from ${payerName.split(" ")[0]} disputed — removed.`);
      router.refresh();
    } finally {
      setDisputingId(null);
    }
  }

  return (
    <div className="mb-6">
      {/* Section header — amber, matching PendingConfirmations */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0
                          bg-amber-50 dark:bg-amber-900/30">
            <Link2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Guest payment reports
          </span>
          <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r
                          from-amber-200/70 to-transparent
                          dark:from-amber-800/40 dark:to-transparent" />
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                           bg-amber-100 dark:bg-amber-900/40
                           text-amber-700 dark:text-amber-300">
            {visible.length}
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 pl-9">
          {visible.length === 1
            ? "1 guest reported a payment"
            : `${visible.length} guests reported payments`} — awaiting confirmation
        </p>
      </div>

      {/* Badge per pending request */}
      <div className="space-y-2">
        {visible.map((req) => {
          // Creditor (payee) can always confirm; admin can confirm unless they are the payer.
          const isCreditor = !!currentUserId && req.payeeUserId === currentUserId;
          const canConfirm = isCreditor || isAdmin;

          return (
            <PaymentPendingBadge
              key={req.id}
              payerName={req.payerName}
              amount={req.amount !== null ? Number(req.amount) : 0}
              currency={req.currency ?? currency}
              paymentMethod={req.paymentMethod as PaymentMethod | undefined}
              utrReference={req.utrReference ?? undefined}
              canConfirm={canConfirm}
              confirming={confirmingId === req.id}
              disputing={disputingId === req.id}
              onConfirm={() => handleConfirm(req)}
              onDispute={(_reason) => handleDispute(req.id, req.payerName)}
            />
          );
        })}
      </div>
    </div>
  );
}
