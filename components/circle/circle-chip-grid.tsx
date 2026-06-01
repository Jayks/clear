"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Ghost } from "lucide-react";
import { RecordContributionSheet } from "./record-contribution-sheet";
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
  /** Goal mode — allows recording additional contributions on already-paid chips */
  isGoal?:         boolean;
}

export function CircleChipGrid({
  members, isAdmin, currentMemberId, amount, currency, period, periodLabel, groupId, isGoal,
}: Props) {
  const router = useRouter();

  const [recordMember, setRecordMember] = useState<PendingMember | null>(null);
  const [isAdditional, setIsAdditional] = useState(false);

  const handleSuccess = useCallback(() => {
    setRecordMember(null);
    setIsAdditional(false);
    router.refresh();
  }, [router]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const isMe = m.id === currentMemberId;

          // Admin taps ⏳ chips to record a fresh contribution.
          // isPendingConfirm chips are non-tappable — confirming happens in the batch banner.
          const canRecord  = isAdmin && !m.isPaid && !m.isPendingConfirm;
          // Admin can tap ✓ chips in goal mode to record additional contributions
          const canAddMore = isAdmin && isGoal && m.isPaid && !m.isPendingConfirm;

          const tappable = canRecord || canAddMore;

          // ── Chip colour — two states only (paid ✓ / unpaid ⏳) ──────────
          // isPendingConfirm chips stay grey — "says paid" text is the signal
          let chipClass: string;
          if (m.isPaid) {
            chipClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300";
          } else {
            chipClass = "bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300";
          }

          function handleTap() {
            if (canRecord) {
              setIsAdditional(false);
              setRecordMember({ id: m.id, name: m.name, isGuest: m.isGuest });
            } else if (canAddMore) {
              setIsAdditional(true);
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
                ${canAddMore ? "hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50/40 dark:hover:bg-violet-900/10" : ""}
              `}
              onClick={tappable ? handleTap : undefined}
              role={tappable ? "button" : undefined}
              tabIndex={tappable ? 0 : undefined}
              onKeyDown={tappable ? (e) => e.key === "Enter" && handleTap() : undefined}
            >
              {/* Status icon */}
              {m.isPaid ? (
                <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
              ) : m.isGuest ? (
                <Ghost className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              ) : (
                <span className="text-[10px] shrink-0">⏳</span>
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

              {/* "says paid" marker — member self-reported, awaiting banner confirm */}
              {!m.isPaid && m.isPendingConfirm && (
                <span className="text-[9px] text-amber-500/80 dark:text-amber-400/70 font-medium leading-none">
                  {isMe ? "you say paid" : "says paid"}
                </span>
              )}

              {/* "+" hint — goal mode, paid chip, admin can add more */}
              {canAddMore && (
                <span className="text-[9px] font-bold text-violet-500 dark:text-violet-400 shrink-0 leading-none">+</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Record new / additional contribution */}
      {recordMember && (
        <RecordContributionSheet
          member={recordMember}
          amount={amount ?? 0}
          currency={currency}
          period={period}
          periodLabel={periodLabel}
          groupId={groupId}
          isAdditional={isAdditional}
          isOpen={!!recordMember}
          onClose={() => { setRecordMember(null); setIsAdditional(false); }}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
