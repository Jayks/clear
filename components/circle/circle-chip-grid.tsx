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
  amount:          number | null;    // contribution_amount from the group
  currency:        string;
  period:          string | null;    // "2026-06" for recurring, null for goal
  periodLabel:     string | null;    // "June 2026"
  groupId:         string;
}

export function CircleChipGrid({
  members, isAdmin, currentMemberId, amount, currency, period, periodLabel, groupId,
}: Props) {
  const router = useRouter();
  const [recordMember, setRecordMember] = useState<PendingMember | null>(null);

  const handleSuccess = useCallback(() => {
    setRecordMember(null);
    router.refresh();
  }, [router]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const isMe    = m.id === currentMemberId;
          const canTap  = isAdmin && !m.isPaid && amount;

          // Chip visual state
          const chipClass = m.isPaid
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300"
            : "bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300";

          const chip = (
            <div
              key={m.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all
                ${chipClass}
                ${canTap ? "cursor-pointer hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:scale-95" : ""}`}
              onClick={canTap ? () => setRecordMember({ id: m.id, name: m.name, isGuest: m.isGuest }) : undefined}
              role={canTap ? "button" : undefined}
              tabIndex={canTap ? 0 : undefined}
              onKeyDown={canTap ? (e) => e.key === "Enter" && setRecordMember({ id: m.id, name: m.name, isGuest: m.isGuest }) : undefined}
            >
              {/* Status icon */}
              {m.isPaid ? (
                <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
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

              {/* Contribution date tooltip — shown when paid */}
              {m.isPaid && m.contributionDate && (
                <span className="text-[10px] text-emerald-500/70 dark:text-emerald-400/60 font-normal leading-none hidden sm:inline">
                  {m.contributionDate}
                </span>
              )}
            </div>
          );

          return chip;
        })}
      </div>

      {/* Record contribution sheet — admin one-tap confirm */}
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
    </>
  );
}
