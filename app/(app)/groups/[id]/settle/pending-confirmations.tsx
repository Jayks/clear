"use client";

/**
 * PendingConfirmations — section showing unconfirmed (self-reported) settlements.
 *
 * Each card shows PaymentPendingBadge:
 *   canConfirm = isAdmin || toMemberUserId === currentUserId
 *
 * `focusId` (from ?confirm= searchParam) auto-scrolls to the matching card —
 * used when the creditor arrives via a push notification deep link.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { PaymentPendingBadge } from "@/components/payment/payment-pending-badge";
import { confirmSettlement, disputeSettlement } from "@/app/actions/settlements";
import { hapticSuccess } from "@/lib/haptics";
import type { PendingSettlement } from "@/lib/db/queries/settlements";
import type { PaymentMethod } from "@/lib/payment/types";

interface Props {
  pending:       PendingSettlement[];
  groupId:       string;
  currentUserId: string | undefined;
  isAdmin:       boolean;
  /** Auto-scroll to this settlement ID (from ?confirm= push-notification deep link) */
  focusId?:      string;
  /** Called just before the confirm action so the parent can hide the matching
   *  suggestion card and hero pill optimistically. */
  onConfirmOptimistic?: (s: PendingSettlement) => void;
  /** Called if the confirm action fails — rolls back the parent's optimistic hide. */
  onConfirmRollback?:   (s: PendingSettlement) => void;
}

export function PendingConfirmations({
  pending, groupId, currentUserId, isAdmin, focusId,
  onConfirmOptimistic, onConfirmRollback,
}: Props) {
  const router = useRouter();
  // confirmingId / disputingId track which row is loading
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [disputingId,  setDisputingId]  = useState<string | null>(null);
  // Optimistic removal — rows vanish immediately; rolled back on server error
  const [removedIds,   setRemovedIds]   = useState<Set<string>>(new Set());
  const focusRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the focused settlement (pushed from push notification)
  useEffect(() => {
    if (!focusId || !focusRef.current) return;
    const t = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 600);
    return () => clearTimeout(t);
  }, [focusId]);

  const visible = pending.filter((p) => !removedIds.has(p.id));
  if (visible.length === 0) return null;

  async function handleConfirm(settlement: PendingSettlement) {
    setConfirmingId(settlement.id);
    setRemovedIds((prev) => new Set([...prev, settlement.id]));
    onConfirmOptimistic?.(settlement);
    try {
      const result = await confirmSettlement(settlement.id, groupId);
      if (!result.ok) {
        setRemovedIds((prev) => { const s = new Set(prev); s.delete(settlement.id); return s; });
        onConfirmRollback?.(settlement);
        toast.error(result.error);
        return;
      }
      hapticSuccess();
      toast.success("Payment confirmed ✓");
      router.refresh();
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleDispute(id: string, payerName: string, reason: string) {
    setDisputingId(id);
    try {
      const result = await disputeSettlement(id, groupId, reason);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(`Payment from ${payerName.split(" ")[0]} disputed — record removed.`);
      router.refresh();
    } finally {
      setDisputingId(null);
    }
  }

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0
                          bg-amber-50 dark:bg-amber-900/30">
            <Bell className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Pending confirmation
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
          {visible.length === 1 ? "1 payment reported" : `${visible.length} payments reported`} — awaiting your confirmation
        </p>
      </div>

      {/* Badge per pending settlement */}
      <div className="space-y-2">
        {visible.map((p) => {
          // Creditor can always confirm. Admin can confirm UNLESS they are the
          // one who self-reported (prevents confirming your own payment).
          const isCreditor  = !!currentUserId && p.toMemberUserId   === currentUserId;
          const isPayer     = !!currentUserId && p.fromMemberUserId === currentUserId;
          const canConfirm  = isCreditor || (isAdmin && !isPayer);
          const isFocused  = p.id === focusId;

          return (
            <div
              key={p.id}
              ref={isFocused ? focusRef : null}
              className={isFocused ? "ring-2 ring-amber-400/60 dark:ring-amber-500/40 rounded-xl" : undefined}
            >
              <PaymentPendingBadge
                payerName={p.fromMemberName}
                amount={Number(p.amount)}
                currency={p.currency}
                paymentMethod={p.paymentMethod as PaymentMethod | undefined}
                utrReference={p.utrReference ?? undefined}
                canConfirm={canConfirm}
                confirming={confirmingId === p.id}
                disputing={disputingId === p.id}
                onConfirm={() => handleConfirm(p)}
                onDispute={(reason) => handleDispute(p.id, p.fromMemberName, reason)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
