"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Clock, Repeat2, Target } from "lucide-react";
import type { Group } from "@/lib/db/schema/groups";
import type { CircleCardData, PendingMember } from "@/lib/db/queries/circle";
import { selfReportContribution } from "@/app/actions/circle";
import { toast } from "sonner";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import { formatCurrency } from "@/lib/utils";
import { RecordContributionSheet } from "./record-contribution-sheet";

interface Props {
  group:    Group;
  cardData: CircleCardData;
}

export function CircleCard({ group, cardData }: Props) {
  const {
    totalMembers, paidThisCycle, totalContributed, poolBalance,
    isAdmin, currentUserPaid, pendingMembers,
    currentPeriod, currentPeriodLabel,
  } = cardData;

  const isRecurring = group.circleMode === "recurring";
  const isGoal      = group.circleMode === "goal";

  // Optimistic state — updated immediately on self-report / admin record
  const [localUserPaid,  setLocalUserPaid]  = useState(currentUserPaid);
  const [localPaidCount, setLocalPaidCount] = useState(paidThisCycle);
  const [localPending,   setLocalPending]   = useState<PendingMember[]>(pendingMembers);

  const [recordMember,   setRecordMember]   = useState<PendingMember | null>(null);
  const [selfReporting,  setSelfReporting]  = useState(false);

  // ── Progress ────────────────────────────────────────────────────────────────
  const targetNum  = isGoal && group.targetAmount ? Number(group.targetAmount) : null;
  const progressPct = targetNum
    ? Math.min(100, (totalContributed / targetNum) * 100)
    : totalMembers > 0
    ? Math.min(100, (localPaidCount / totalMembers) * 100)
    : 0;

  // ── Deadline countdown ───────────────────────────────────────────────────────
  const daysLeft = isGoal && group.eventDate
    ? Math.max(0, Math.ceil((new Date(group.eventDate).getTime() - Date.now()) / 86_400_000))
    : null;

  // Short month label for recurring: "Jun"
  const monthShort = new Date().toLocaleString("en-IN", { month: "short" });

  // Max 2 pending chips on card; rest go to dashboard
  const visiblePending = localPending.slice(0, 2);
  const morePending    = localPending.length - visiblePending.length;

  // UPI Pay Now — only when both upiId and a fixed per-person amount exist
  const amount   = group.contributionAmount ? Number(group.contributionAmount) : null;
  const upiLink  = group.upiId && amount
    ? `upi://pay?pa=${encodeURIComponent(group.upiId)}&am=${amount}&cu=${group.defaultCurrency}&tn=${encodeURIComponent(group.name + " " + monthShort)}`
    : null;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleChipTap(m: PendingMember) {
    hapticLight();
    setRecordMember(m);
  }

  function handleRecordSuccess() {
    if (!recordMember) return;
    setLocalPaidCount((n) => n + 1);
    setLocalPending((prev) => prev.filter((m) => m.id !== recordMember.id));
    setRecordMember(null);
  }

  async function handleSelfReport() {
    if (selfReporting || localUserPaid || !amount) return;
    hapticLight();
    setSelfReporting(true);

    const result = await selfReportContribution({
      groupId:  group.id,
      amount,
      period:   isRecurring ? currentPeriod : null,
      currency: group.defaultCurrency,
    });

    setSelfReporting(false);
    if (result.ok) {
      hapticSuccess();
      setLocalUserPaid(true);
      setLocalPaidCount((n) => n + 1);
      toast.success(`Marked as paid for ${monthShort}`);
    } else {
      toast.error(result.error ?? "Failed to record");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden h-full flex flex-col">

        {/* ── Clickable header + progress — navigates to group dashboard ──── */}
        <Link
          href={`/groups/${group.id}`}
          className="block hover:bg-white/30 dark:hover:bg-slate-700/20 transition-colors"
        >
          {/* Mode-coloured accent strip */}
          <div
            className={`h-1 w-full ${isGoal
              ? "bg-gradient-to-r from-rose-400 to-pink-500"
              : "bg-gradient-to-r from-violet-500 to-purple-600"}`}
          />

          <div className="px-4 pt-4 pb-3 space-y-3">
            {/* ── Card header ─────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Mode badge + period / countdown */}
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide
                                    px-1.5 py-0.5 rounded
                    ${isGoal
                      ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                      : "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"}`}
                  >
                    {isGoal ? <Target className="w-2.5 h-2.5" /> : <Repeat2 className="w-2.5 h-2.5" />}
                    {isGoal ? "goal" : "monthly"}
                  </span>
                  {isGoal && daysLeft !== null && (
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

            {/* ── Progress bar ────────────────────────────────────────────── */}
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
                      : isGoal
                      ? "bg-gradient-to-r from-rose-400 to-pink-500"
                      : "bg-gradient-to-r from-violet-500 to-purple-600"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </Link>

        {/* ── Action section — interactive buttons, outside the Link ──────── */}
        <div className="flex flex-col flex-1 px-4 pb-4 gap-3">
          {/* ── Admin view ────────────────────────────────────────────────── */}
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

          {/* Admin — all paid celebration */}
          {isAdmin && localPending.length === 0 && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mt-auto">
              <Check className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {isRecurring ? `Everyone paid for ${monthShort} 🎉` : "All contributed 🎉"}
              </span>
            </div>
          )}

          {/* ── Member view — paid ────────────────────────────────────────── */}
          {!isAdmin && localUserPaid && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mt-auto">
              <Check className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {isRecurring ? `You're clear for ${monthShort}` : "You've contributed"}
              </span>
            </div>
          )}

          {/* ── Member view — unpaid ──────────────────────────────────────── */}
          {!isAdmin && !localUserPaid && (
            <div className="mt-auto space-y-2">
              {/* Status line */}
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                <span className="text-[11px] font-medium leading-tight">
                  {isRecurring
                    ? `Your ${monthShort} contribution pending`
                    : "Your contribution pending"}
                  {amount ? ` · ${formatCurrency(amount, group.defaultCurrency)}` : ""}
                </span>
              </div>
              {/* Action buttons — only when a fixed amount is set */}
              {amount && (
                <div className="flex gap-2">
                  {upiLink && (
                    <a
                      href={upiLink}
                      className="flex-1 py-1.5 text-center text-[11px] font-semibold rounded-lg
                                 bg-gradient-to-br from-violet-500 to-purple-600 text-white
                                 shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity"
                    >
                      Pay ↗
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleSelfReport}
                    disabled={selfReporting}
                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition-colors
                      border-slate-200 dark:border-slate-700
                      text-slate-600 dark:text-slate-300
                      hover:bg-slate-50 dark:hover:bg-slate-800/60
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${upiLink ? "w-20" : "flex-1"}`}
                  >
                    {selfReporting ? "…" : "I've paid"}
                  </button>
                </div>
              )}
              {/* Goal with open amounts — just link to dashboard */}
              {!amount && isGoal && (
                <Link
                  href={`/groups/${group.id}`}
                  className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline"
                >
                  Contribute →
                </Link>
              )}
            </div>
          )}
        </div>{/* end action section */}
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
          isOpen={!!recordMember}
          onClose={() => setRecordMember(null)}
          onSuccess={handleRecordSuccess}
        />
      )}
    </>
  );
}
