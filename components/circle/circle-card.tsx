"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Clock, Repeat2, Target } from "lucide-react";
import type { Group } from "@/lib/db/schema/groups";
import type { CircleCardData, PendingMember } from "@/lib/db/queries/circle";
import { formatCurrency } from "@/lib/utils";
import { RecordContributionSheet } from "./record-contribution-sheet";
import { CircleContributeAction } from "./circle-contribute-action";

interface Props {
  group:    Group;
  cardData: CircleCardData;
}

export function CircleCard({ group, cardData }: Props) {
  const {
    totalMembers, paidThisCycle, totalContributed,
    isAdmin, currentUserPaid, pendingMembers, paidMembers,
    currentUserPendingConfirm: serverPendingConfirm,
    currentPeriod, currentPeriodLabel,
  } = cardData;

  const isRecurring = group.circleMode === "recurring";
  const isOneTime   = group.circleMode === "one_time";
  const isFixed     = isOneTime && group.contributionAmount !== null;
  const isFlexi     = isOneTime && group.contributionAmount === null;

  // Optimistic state for admin chip recording
  const [localPaidCount, setLocalPaidCount] = useState(paidThisCycle);
  const [localPending,   setLocalPending]   = useState<PendingMember[]>(pendingMembers);
  const [recordMember,         setRecordMember]         = useState<PendingMember | null>(null);
  const [recordIsAdditional,   setRecordIsAdditional]   = useState(false);

  // ── Progress ──────────────────────────────────────────────────────────────
  const targetNum  = isOneTime && group.targetAmount ? Number(group.targetAmount) : null;
  const progressPct = targetNum
    ? Math.min(100, (totalContributed / targetNum) * 100)
    : totalMembers > 0
    ? Math.min(100, (localPaidCount / totalMembers) * 100)
    : 0;

  // ── Deadline countdown ────────────────────────────────────────────────────
  const daysLeft = isOneTime && group.eventDate
    ? Math.max(0, Math.ceil((new Date(group.eventDate).getTime() - Date.now()) / 86_400_000))
    : null;

  const monthShort = new Date().toLocaleString("en-IN", { month: "short" });

  // Max 2 pending chips on card; rest go to dashboard
  const visiblePending = localPending.slice(0, 2);
  const morePending    = localPending.length - visiblePending.length;

  const amount  = group.contributionAmount ? Number(group.contributionAmount) : null;

  // ── Admin chip handlers ───────────────────────────────────────────────────
  function handleChipTap(m: PendingMember, additional = false) {
    setRecordIsAdditional(additional);
    setRecordMember(m);
  }

  function handleRecordSuccess() {
    if (!recordMember) return;
    setLocalPaidCount((n) => n + 1);
    setLocalPending((prev) => prev.filter((m) => m.id !== recordMember.id));
    setRecordMember(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="glass rounded-2xl overflow-hidden h-full flex flex-col">

        {/* ── Clickable header + progress — navigates to group dashboard ─── */}
        <Link
          href={`/groups/${group.id}`}
          className="block hover:bg-white/30 dark:hover:bg-slate-700/20 transition-colors"
        >
          {/* Mode-coloured accent strip */}
          <div
            className={`h-1 w-full ${isOneTime
              ? "bg-gradient-to-r from-rose-400 to-pink-500"
              : "bg-gradient-to-r from-violet-500 to-purple-600"}`}
          />

          <div className="px-4 pt-4 pb-3 space-y-3">
            {/* Card header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide
                                    px-1.5 py-0.5 rounded
                    ${isOneTime
                      ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                      : "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"}`}
                  >
                    {isOneTime ? <Target className="w-2.5 h-2.5" /> : <Repeat2 className="w-2.5 h-2.5" />}
                    {isOneTime ? "one-time" : "monthly"}
                  </span>
                  {isOneTime && daysLeft !== null && (
                    <span className={`text-[10px] font-medium ${daysLeft <= 3 ? "text-red-500 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                      {daysLeft === 0 ? "today!" : `${daysLeft}d left`}
                    </span>
                  )}
                  {isRecurring && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{monthShort}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {group.name}
                </p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                {targetNum ? (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(totalContributed, group.defaultCurrency)}
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      {" "}/ {formatCurrency(targetNum, group.defaultCurrency)}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(totalContributed, group.defaultCurrency)} collected
                  </span>
                )}
                <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                  {localPaidCount}/{totalMembers}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPct >= 100
                      ? "bg-gradient-to-r from-emerald-400 to-green-500"
                      : isOneTime
                      ? "bg-gradient-to-r from-rose-400 to-pink-500"
                      : "bg-gradient-to-r from-violet-500 to-purple-600"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </Link>

        {/* ── Action section — outside the Link ─────────────────────────── */}
        <div className="flex flex-col flex-1 px-4 pb-4 gap-2">

          {/* ── Admin: pending chips ─────────────────────────────────────── */}
          {isAdmin && localPending.length > 0 && (
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 leading-none">
                Tap to record ↓
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visiblePending.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleChipTap(m)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium
                               bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                               border border-slate-200/80 dark:border-slate-700/60
                               hover:border-violet-300 dark:hover:border-violet-600
                               hover:bg-violet-50 dark:hover:bg-violet-900/20
                               active:scale-95 transition-all"
                  >
                    <span>⏳</span>
                    <span className="max-w-[72px] truncate">{m.name}</span>
                  </button>
                ))}
                {morePending > 0 && (
                  <Link
                    href={`/groups/${group.id}`}
                    className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium
                               bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400
                               hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    +{morePending}
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Admin: all paid ──────────────────────────────────────────── */}
          {isAdmin && localPending.length === 0 && (
            <div className="mt-auto space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  {isRecurring ? `Everyone paid for ${monthShort} 🎉` : "All contributed 🎉"}
                </span>
              </div>
              {/* One-time mode — tappable paid chips for additional contributions */}
              {isOneTime && paidMembers.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 leading-none">
                    Tap to record more ↓
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {paidMembers.slice(0, 3).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleChipTap(m, true)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium
                                   bg-emerald-50 dark:bg-emerald-900/20
                                   text-emerald-700 dark:text-emerald-300
                                   border border-emerald-200 dark:border-emerald-800/40
                                   hover:border-violet-400 dark:hover:border-violet-600
                                   hover:bg-violet-50 dark:hover:bg-violet-900/20
                                   hover:text-violet-700 dark:hover:text-violet-300
                                   active:scale-95 transition-all"
                      >
                        <Check className="w-2.5 h-2.5 shrink-0" />
                        <span className="max-w-[60px] truncate">{m.name}</span>
                        <span className="font-bold text-violet-500 dark:text-violet-400 text-[10px]">+</span>
                      </button>
                    ))}
                    {paidMembers.length > 3 && (
                      <Link
                        href={`/groups/${group.id}`}
                        className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium
                                   bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400
                                   hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        +{paidMembers.length - 3}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Member view: CircleContributeAction ─────────────────────── */}
          {!isAdmin && (
            <div className="mt-auto">
              <CircleContributeAction
                groupId={group.id}
                groupName={group.name}
                isPaid={currentUserPaid}
                isPendingConfirm={serverPendingConfirm}
                amount={amount}
                currency={group.defaultCurrency}
                period={isRecurring ? currentPeriod : null}
                periodLabel={isRecurring ? currentPeriodLabel : null}
                isRecurring={isRecurring}
                upiId={group.upiId ?? null}
                size="card"
              />
            </div>
          )}
        </div>
      </div>

      {/* Record contribution sheet — admin one-tap confirm */}
      {recordMember && (
        <RecordContributionSheet
          member={recordMember}
          amount={amount ?? 0}
          currency={group.defaultCurrency}
          period={isRecurring ? currentPeriod : null}
          periodLabel={isRecurring ? currentPeriodLabel : null}
          groupId={group.id}
          isAdditional={recordIsAdditional}
          isOpen={!!recordMember}
          onClose={() => { setRecordMember(null); setRecordIsAdditional(false); }}
          onSuccess={handleRecordSuccess}
        />
      )}
    </>
  );
}
