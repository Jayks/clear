"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Ghost } from "lucide-react";
import { RecordContributionSheet } from "./record-contribution-sheet";
import { ConfirmContributionSheet } from "./confirm-contribution-sheet";
import type { MemberDashboardStatus } from "@/lib/db/queries/circle";
import type { PendingMember } from "@/lib/db/queries/circle";

interface Props {
  members:         MemberDashboardStatus[];
  isAdmin:         boolean;
  currentMemberId: string | null;
  amount:          number | null;
  currency:        string;
  period:          string | null;
  periodLabel:     string | null;
  groupId:         string;
}

export function CircleChipGrid({
  members, isAdmin, currentMemberId, amount, currency, period, periodLabel, groupId,
}: Props) {
  const router = useRouter();

  // For recording a new contribution (⏳ chip tap)
  const [recordMember, setRecordMember] = useState<PendingMember | null>(null);

  // For confirming/rejecting a self-report (🟡 chip tap)
  const [confirmMember, setConfirmMember] = useState<{
    id: string; name: string; userId: string | null;
    contributionId: string; amount: number;
  } | null>(null);

  const handleSuccess = useCallback(() => {
    setRecordMember(null);
    setConfirmMember(null);
    router.refresh();
  }, [router]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const isMe = m.id === currentMemberId;

          // Admin can tap ⏳ chips to record (when amount is set)
          const canRecord = isAdmin && !m.isPaid && !m.isPendingConfirm && !!amount;
          // Admin can tap 🟡 chips to confirm or reject
          const canConfirm = isAdmin && m.isPendingConfirm && !!m.unconfirmedContributionId;

          // ── Chip colour ──────────────────────────────────────────────────
          let chipClass: string;
          if (m.isPaid) {
            chipClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300";
          } else if (m.isPendingConfirm) {
            chipClass = "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300";
          } else {
            chipClass = "bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300";
          }

          const tappable = canRecord || canConfirm;

          function handleTap() {
            if (canConfirm) {
              setConfirmMember({
                id:             m.id,
                name:           m.name,
                userId:         m.userId,
                contributionId: m.unconfirmedContributionId!,
                amount:         amount ?? 0,
              });
            } else if (canRecord) {
              setRecordMember({ id: m.id, name: m.name, isGuest: m.isGuest });
            }
          }

          return (
            <div
              key={m.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all
                ${chipClass}
                ${tappable ? "cursor-pointer active:scale-95" : ""}
                ${canRecord  ? "hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20" : ""}
                ${canConfirm ? "hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20" : ""}
              `}
              onClick={tappable ? handleTap : undefined}
              role={tappable ? "button" : undefined}
              tabIndex={tappable ? 0 : undefined}
              onKeyDown={tappable ? (e) => e.key === "Enter" && handleTap() : undefined}
            >
              {/* Status icon */}
              {m.isPaid ? (
                <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
              ) : m.isPendingConfirm ? (
                <span className="text-amber-500 text-[10px] shrink-0">🟡</span>
              ) : m.isGuest ? (
                <Ghost className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              ) : (
                <span className="text-amber-500 text-[10px] shrink-0">⏳</span>
              )}

              {/* Name */}
              <span className="max-w-[80px] truncate">
                {isMe ? "You" : m.name}
              </span>

              {/* Admin role indicator */}
              {m.role === "admin" && !isMe && (
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal leading-none">(admin)</span>
              )}

              {/* Contribution date — confirmed */}
              {m.isPaid && m.contributionDate && (
                <span className="text-[10px] text-emerald-500/70 dark:text-emerald-400/60 font-normal leading-none hidden sm:inline">
                  {m.contributionDate}
                </span>
              )}

              {/* "Says paid" label — pending confirm */}
              {m.isPendingConfirm && isAdmin && (
                <span className="text-[9px] text-amber-600/70 dark:text-amber-400/60 font-normal leading-none hidden sm:inline">
                  says paid
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Record new contribution (⏳ chip) */}
      {recordMember && (
        <RecordContributionSheet
          member={recordMember}
          amount={amount ?? 0}
          currency={currency}
          period={period}
          periodLabel={periodLabel}
          groupId={groupId}
          isOpen={!!recordMember}
          onClose={() => setRecordMember(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Confirm / reject self-report (🟡 chip) */}
      {confirmMember && (
        <ConfirmContributionSheet
          member={confirmMember}
          currency={currency}
          periodLabel={periodLabel}
          groupId={groupId}
          isOpen={!!confirmMember}
          onClose={() => setConfirmMember(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
