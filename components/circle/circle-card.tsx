"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Check, MoreHorizontal, Repeat2, Target } from "lucide-react";
import { toast } from "sonner";
import type { Group } from "@/lib/db/schema/groups";
import type { CircleCardData, PendingMember } from "@/lib/db/queries/circle";
import { formatCurrency } from "@/lib/utils";
import { selfReportContribution } from "@/app/actions/circle";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { RecordContributionSheet } from "./record-contribution-sheet";
import { TripCardShareDrawer } from "@/components/trip/trip-card-share-drawer";
import { GroupActionHub } from "@/components/trip/group-action-hub";

interface Props {
  group:    Group;
  cardData: CircleCardData;
}

export function CircleCard({ group, cardData }: Props) {
  const {
    totalMembers, paidThisCycle, totalContributed,
    walletBalance,
    isAdmin, currentUserPaid, pendingMembers,
    currentUserPendingConfirm: serverPendingConfirm,
    currentPeriod, currentPeriodLabel,
  } = cardData;

  const isRecurring = group.circleMode === "recurring";
  const isOneTime   = group.circleMode === "one_time";
  const isFixed     = isOneTime && group.contributionAmount !== null;
  const isFlexi     = isOneTime && group.contributionAmount === null;

  const [localPaidCount,      setLocalPaidCount]      = useState(paidThisCycle);
  const [localPending,        setLocalPending]        = useState<PendingMember[]>(pendingMembers);
  const [localUserPaid,       setLocalUserPaid]       = useState(currentUserPaid);
  const [localPendingConfirm, setLocalPendingConfirm] = useState(serverPendingConfirm);
  const [recordMember,        setRecordMember]        = useState<PendingMember | null>(null);
  const [selfReporting,       setSelfReporting]       = useState(false);

  // ── Long-press + hub state (mirrors TripCard pattern) ─────────────────────
  const [isNavOpen,      setIsNavOpen]      = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextClick = useRef(false);
  const navBlockedRef   = useRef(false);
  const touchStartPos   = useRef<{ x: number; y: number } | null>(null);

  const LONG_PRESS_MS  = 500;
  const MOVE_THRESHOLD = 8;

  function startLongPress(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      suppressNextClick.current = true;
      setIsLongPressing(false);
      try { navigator.vibrate?.(12); } catch { /* unavailable */ }
      setIsNavOpen(true);
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartPos.current) return;
    const t = e.touches[0];
    const moved =
      Math.abs(t.clientX - touchStartPos.current.x) > MOVE_THRESHOLD ||
      Math.abs(t.clientY - touchStartPos.current.y) > MOVE_THRESHOLD;
    if (moved) cancelLongPress();
  }

  function cancelLongPress() {
    setIsLongPressing(false);
    touchStartPos.current = null;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleShareOpenChange(open: boolean) {
    if (!open) {
      cancelLongPress();
      navBlockedRef.current = true;
      setTimeout(() => { navBlockedRef.current = false; }, 300);
    }
  }

  // ── Mode-aware colours ────────────────────────────────────────────────────
  // Light mode:  very pale tinted gradient so coloured pattern pops
  // Dark mode:   deep dark with slight colour tint so white-ish pattern pops
  const heroGrad = isOneTime
    ? "from-orange-50 to-amber-100 dark:from-slate-800 dark:to-amber-900"
    : "from-slate-100 to-indigo-100 dark:from-slate-800 dark:to-indigo-900";

  const progressCls  = isOneTime ? "from-amber-400 to-orange-500" : "from-indigo-400 to-violet-500";
  const ctaBtnCls    = isOneTime ? "from-amber-500 to-orange-500" : "from-indigo-500 to-violet-600";
  // Ambient resting shadow in mode colour — matches TripCard Plus opacity levels (/15 rest, /30 hover)
  const cardShadow   = isOneTime
    ? "shadow-md shadow-amber-500/15 hover:shadow-xl hover:shadow-amber-500/30"
    : "shadow-md shadow-violet-500/15 hover:shadow-xl hover:shadow-violet-500/30";
  // Mode badge tinted with mode colour — reinforces gradient + pattern language
  const badgeCls     = isOneTime
    ? "bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200"
    : "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200";
  const pendingCls  = isOneTime
    ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50"
    : "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50";

  // ── Background patterns ────────────────────────────────────────────────────
  // Light mode:  coloured strokes (indigo / amber) on pale gradient — pops clearly
  // Dark mode:   white strokes on deep dark gradient — pops clearly
  // Two overlay divs, toggled via dark:hidden / hidden dark:block
  const patternLight = isRecurring
    ? {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Cline x1='0' y1='30' x2='200' y2='30' stroke='%236366f1' stroke-width='0.5' stroke-opacity='0.18' stroke-dasharray='4 3'/%3E%3Cpath d='M0,30 C55,2 100,2 100,30 S145,58 200,30' stroke='%236366f1' stroke-width='2' stroke-opacity='0.22' fill='none'/%3E%3Ccircle cx='0' cy='30' r='2.5' fill='%236366f1' fill-opacity='0.22'/%3E%3Ccircle cx='71' cy='9' r='2.5' fill='%236366f1' fill-opacity='0.28'/%3E%3Ccircle cx='100' cy='30' r='2.5' fill='%236366f1' fill-opacity='0.22'/%3E%3Ccircle cx='129' cy='51' r='2.5' fill='%236366f1' fill-opacity='0.28'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 60px",
        backgroundRepeat: "repeat" as const,
      }
    : {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Cline x1='20' y1='40' x2='20' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='20' cy='38' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3Cline x1='58' y1='24' x2='58' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='58' cy='22' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3Cline x1='96' y1='44' x2='96' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='96' cy='42' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3Cline x1='132' y1='30' x2='132' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='132' cy='28' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3Cline x1='170' y1='36' x2='170' y2='58' stroke='%23f59e0b' stroke-width='1.5' stroke-opacity='0.20'/%3E%3Ccircle cx='170' cy='34' r='2.5' fill='%23f59e0b' fill-opacity='0.28'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 60px",
        backgroundRepeat: "repeat" as const,
      };

  const patternDark = isRecurring
    ? {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Cline x1='0' y1='30' x2='200' y2='30' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.07' stroke-dasharray='4 3'/%3E%3Cpath d='M0,30 C55,2 100,2 100,30 S145,58 200,30' stroke='%23ffffff' stroke-width='1.5' stroke-opacity='0.10' fill='none'/%3E%3Ccircle cx='0' cy='30' r='2.5' fill='%23ffffff' fill-opacity='0.12'/%3E%3Ccircle cx='71' cy='9' r='2.5' fill='%23ffffff' fill-opacity='0.16'/%3E%3Ccircle cx='100' cy='30' r='2.5' fill='%23ffffff' fill-opacity='0.12'/%3E%3Ccircle cx='129' cy='51' r='2.5' fill='%23ffffff' fill-opacity='0.16'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 60px",
        backgroundRepeat: "repeat" as const,
      }
    : {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Cline x1='20' y1='40' x2='20' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='20' cy='38' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3Cline x1='58' y1='24' x2='58' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='58' cy='22' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3Cline x1='96' y1='44' x2='96' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='96' cy='42' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3Cline x1='132' y1='30' x2='132' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='132' cy='28' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3Cline x1='170' y1='36' x2='170' y2='58' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.12'/%3E%3Ccircle cx='170' cy='34' r='2.5' fill='%23ffffff' fill-opacity='0.18'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 60px",
        backgroundRepeat: "repeat" as const,
      };

  // ── Progress ──────────────────────────────────────────────────────────────
  const targetNum   = isOneTime && group.targetAmount ? Number(group.targetAmount) : null;
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
  const amount     = group.contributionAmount ? Number(group.contributionAmount) : null;

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = `${appUrl}/join/${group.shareToken}`;

  // ── Actions ───────────────────────────────────────────────────────────────
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
      if (isAdmin) {
        // Admin self-reports are auto-confirmed — go straight to paid state
        setLocalUserPaid(true);
        setLocalPaidCount((n) => n + 1);
        toast.success("Contribution recorded ✓");
      } else {
        setLocalPendingConfirm(true);
        toast.success("Reported — pending admin confirmation");
      }
    } else {
      toast.error(result.error ?? "Failed to report");
    }
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
      {/* Outer wrapper: shadow + hover lift + long-press — NO overflow-hidden so shadow paints cleanly */}
      <div
        className={`relative h-full select-none ${cardShadow} hover:-translate-y-0.5 transition-all duration-200 ${isLongPressing ? "scale-[0.97] duration-500" : ""}`}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={handleTouchMove}
        onTouchCancel={cancelLongPress}
        onContextMenu={(e) => { if (suppressNextClick.current) e.preventDefault(); }}
        style={{ WebkitTouchCallout: "none", touchAction: "manipulation" } as React.CSSProperties}
      >
      {/* Long-press ring indicator */}
      {isLongPressing && (
        <div className="absolute inset-0 z-20 rounded-2xl ring-2 ring-violet-400/70 pointer-events-none" />
      )}
      {/* Inner: glass card with overflow-hidden for content clipping */}
      <div className="glass rounded-2xl overflow-hidden relative h-full flex flex-col">

        {/* ── Top-left: mode badge + deadline / month pill ──────────────── */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide
                           ${badgeCls} backdrop-blur-sm px-2 py-0.5 rounded-full`}>
            {isOneTime ? <Target className="w-2.5 h-2.5" /> : <Repeat2 className="w-2.5 h-2.5" />}
            {isOneTime ? (isFlexi ? "Flexi" : "One-time") : "Monthly"}
          </span>
          {isOneTime && daysLeft !== null && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
              bg-black/10 dark:bg-black/40 backdrop-blur-sm ${
              daysLeft <= 3
                ? "text-red-600 dark:text-red-300"
                : daysLeft <= 7
                ? "text-amber-700 dark:text-amber-300"
                : "text-slate-600 dark:text-white/70"
            }`}>
              {daysLeft === 0 ? "today!" : `${daysLeft}d left`}
            </span>
          )}
          {isRecurring && (
            <span className="text-[10px] bg-black/10 dark:bg-black/40 backdrop-blur-sm
                             text-slate-600 dark:text-white/70 font-medium px-1.5 py-0.5 rounded-full">
              {monthShort}
            </span>
          )}
        </div>

        {/* ── Top-right: share + hub ────────────────────────────────────── */}
        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-2"
          onTouchStart={(e) => e.stopPropagation()}
        >
          <TripCardShareDrawer url={joinUrl} groupName={group.name} onShareOpenChange={handleShareOpenChange} />
          <button
            type="button"
            onClick={() => { if (!navBlockedRef.current) setIsNavOpen(true); }}
            className="flex w-10 h-10 md:w-8 md:h-8 rounded-xl items-center justify-center text-slate-600 dark:text-slate-300 bg-black/10 dark:bg-black/30 hover:bg-black/20 dark:hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/10 active:scale-95 transition-all"
            aria-label="Group actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* ── Gradient header (h-44 — matches TripCard) ─────────────────── */}
        <Link href={`/groups/${group.id}`} className="block flex-none">
          <div className={`h-44 relative bg-gradient-to-br ${heroGrad}`}>

            {/* Subtle shadow at bottom for text legibility — lighter in light mode */}
            <div className="absolute inset-0 bg-gradient-to-t
              from-black/8 via-transparent to-transparent
              dark:from-black/50 dark:via-black/10 dark:to-transparent" />

            {/* Light mode: coloured pattern */}
            <div className="absolute inset-0 pointer-events-none dark:hidden"
                 style={patternLight} />
            {/* Dark mode: white pattern */}
            <div className="absolute inset-0 pointer-events-none hidden dark:block"
                 style={patternDark} />

            {/* Name + wallet balance */}
            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="text-slate-800 dark:text-white text-xl truncate leading-tight"
                  style={{ fontFamily: "var(--font-fraunces)" }}>
                {group.name}
              </h3>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                {/* Left — truncated so it never wraps */}
                <p className="text-slate-600 dark:text-white/75 text-xs tabular-nums truncate min-w-0">
                  Wallet · {formatCurrency(walletBalance, group.defaultCurrency)}
                </p>
                {/* Right — one secondary hint, shrink-0 so it never wraps */}
                {targetNum ? (
                  <p className="text-slate-500 dark:text-white/60 text-xs tabular-nums shrink-0">
                    of {formatCurrency(targetNum, group.defaultCurrency)}
                  </p>
                ) : amount ? (
                  <p className="text-slate-400 dark:text-white/50 text-xs tabular-nums shrink-0">
                    {formatCurrency(amount, group.defaultCurrency)}{isRecurring ? "/mo" : " each"}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </Link>

        {/* ── Progress bar — visual divider between header and strip ─────── */}
        <div className="h-[3px] bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full transition-all duration-500 bg-gradient-to-r ${
              progressPct >= 100 ? "from-emerald-400 to-green-500" : progressCls
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* ── Bottom strip — flex-1 so it fills remaining height in the grid row ── */}
        <div className="flex flex-1 items-center justify-between px-4 py-3 gap-3">

          {/* Left: paid count or all-done state */}
          {localPaidCount >= totalMembers && totalMembers > 0 ? (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-medium">
                {isRecurring ? `All paid · ${monthShort}` : "All in 🎉"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {localPaidCount}
              </span>
              /{totalMembers} paid
            </span>
          )}

          {/* Right: role-aware CTA */}
          {isAdmin ? (
            localPending.length > 0 && (
              <button
                type="button"
                onClick={() => setRecordMember(localPending[0])}
                className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg ${pendingCls} transition-colors`}
              >
                {localPending.length} pending →
              </button>
            )
          ) : localUserPaid ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium
                             flex items-center gap-1 shrink-0">
              <Check className="w-3 h-3" />
              You&apos;re clear
            </span>
          ) : localPendingConfirm ? (
            <span className="text-[11px] text-cyan-700 dark:text-cyan-300 font-medium shrink-0
                             bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200/60 dark:border-cyan-700/40
                             px-2 py-0.5 rounded-full">
              ⏳ Awaiting confirmation
            </span>
          ) : group.upiId && amount ? (
            /* Navigate to the circle dashboard where the full UpiPayButton picker is available.
               Raw upi:// URIs silently fail on iOS; the dashboard uses the shared UpiPayButton atom. */
            <Link
              href={`/groups/${group.id}`}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg
                bg-gradient-to-br ${ctaBtnCls} text-white shadow-sm hover:opacity-90 transition-opacity shrink-0`}
            >
              Pay via UPI →
            </Link>
          ) : amount ? (
            <button
              type="button"
              onClick={handleSelfReport}
              disabled={selfReporting}
              className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg
                bg-gradient-to-br ${ctaBtnCls} text-white shadow-sm
                hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0`}
            >
              {selfReporting ? "…" : "I've paid"}
            </button>
          ) : (
            <Link
              href={`/groups/${group.id}`}
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400
                hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
            >
              Contribute →
            </Link>
          )}
        </div>
      </div>{/* /inner glass */}
      </div>{/* /outer shadow wrapper */}

      {/* Record contribution sheet — admin quick-record from card */}
      {recordMember && (
        <RecordContributionSheet
          member={recordMember}
          amount={amount ?? 0}
          currency={group.defaultCurrency}
          period={isRecurring ? currentPeriod : null}
          periodLabel={isRecurring ? currentPeriodLabel : null}
          groupId={group.id}
          isAdditional={false}
          isOneTime={isOneTime}
          isOpen={!!recordMember}
          onClose={() => { setRecordMember(null); }}
          onSuccess={handleRecordSuccess}
        />
      )}

      {/* Group action hub — long-press or ⋯ button */}
      <GroupActionHub
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        groupId={group.id}
        groupName={group.name}
        groupType={group.groupType}
        currency={group.defaultCurrency}
        isArchived={group.isArchived ?? false}
        isAdmin={isAdmin}
        joinUrl={joinUrl}
      />
    </>
  );
}
