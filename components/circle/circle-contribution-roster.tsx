"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronDown, ChevronUp, ChevronRight, Ghost, Bell, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RecordContributionSheet } from "./record-contribution-sheet";
import { sendContributionReminder, confirmContributions } from "@/app/actions/circle";
import { formatCurrency } from "@/lib/utils";
import type { MemberDashboardStatus, PendingMember } from "@/lib/db/queries/circle";
import { PAYMENT_METHOD_ICONS } from "@/lib/payment/types";
import type { PaymentMethod } from "@/lib/payment/types";

interface PendingContribution {
  contributionId: string;
  paymentMethod:  string | null;
  utrReference:   string | null;
  amount:         number;
  memberUserId:   string | null;
}

interface Props {
  members:         MemberDashboardStatus[];
  isAdmin:         boolean;
  currentMemberId: string | null;
  amount:          number | null;
  currency:        string;
  period:          string | null;
  periodLabel:     string | null;
  groupId:         string;
  isOneTime?:      boolean;
  hideAmounts?:    boolean;   // admin_only privacy — hide ₹ totals from non-admin members
}

export function CircleContributionRoster({
  members, isAdmin, currentMemberId, amount, currency, period, periodLabel,
  groupId, isOneTime, hideAmounts,
}: Props) {
  const router = useRouter();

  // Mode-aware colour tokens
  const inputFocusCls = isOneTime
    ? "focus:ring-amber-500/20 focus:border-amber-400 dark:focus:border-amber-600"
    : "focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-600";
  const rowHoverCls = isOneTime
    ? "hover:bg-amber-50 dark:hover:bg-amber-900/20"
    : "hover:bg-indigo-50 dark:hover:bg-indigo-900/20";
  const youTextCls = isOneTime
    ? "text-amber-600 dark:text-amber-400"
    : "text-indigo-600 dark:text-indigo-400";
  const bellHoverCls = isOneTime
    ? "hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
    : "hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20";
  const plusTextCls = isOneTime
    ? "text-amber-500 dark:text-amber-400"
    : "text-indigo-500 dark:text-indigo-400";

  const [query,        setQuery]        = useState("");
  const [paidExpanded, setPaidExpanded] = useState(false);
  const [recordMember, setRecordMember] = useState<PendingMember | null>(null);
  const [isAdditional, setIsAdditional] = useState(false);
  const [pendingContrib, setPendingContrib] = useState<PendingContribution | null>(null);
  const [reminding,    setReminding]    = useState<string | null>(null); // memberId being reminded

  // #5 Bulk confirm state: "idle" | "confirm-prompt" | "confirming"
  const [confirmAllState, setConfirmAllState] = useState<"idle" | "confirm-prompt" | "confirming">("idle");

  const q = query.toLowerCase().trim();

  // ── Filter members by search ────────────────────────────────────────────────
  const filtered = useMemo(
    () => q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members,
    [members, q],
  );

  const pendingMembers = filtered.filter((m) => !m.isPaid);
  const paidMembers    = filtered.filter((m) => m.isPaid);

  // Count of pending self-reports awaiting admin confirmation
  const pendingConfirmCount = pendingMembers.filter((m) => m.isPendingConfirm).length;

  // Auto-expand paid section when searching — user expects to find everyone
  const showPaidRows = paidExpanded || q.length > 0;

  // ── Paid collapsed summary ──────────────────────────────────────────────────
  const paidSummary = useMemo(() => {
    if (paidMembers.length === 0) return "";
    const names = paidMembers.slice(0, 3).map((m) =>
      m.id === currentMemberId ? "You" : m.name,
    );
    const rest = paidMembers.length - 3;
    return names.join(" · ") + (rest > 0 ? ` +${rest}` : "");
  }, [paidMembers, currentMemberId]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleRecord(m: MemberDashboardStatus, additional = false) {
    setIsAdditional(additional);
    setRecordMember({ id: m.id, name: m.name, isGuest: m.isGuest });
    // When member has a pending self-report, pass it to show PaymentPendingBadge
    if (m.isPendingConfirm && m.unconfirmedContributionId) {
      setPendingContrib({
        contributionId: m.unconfirmedContributionId,
        paymentMethod:  m.pendingPaymentMethod ?? null,
        utrReference:   m.pendingUtrReference ?? null,
        amount:         m.pendingAmount ?? 0,
        memberUserId:   m.userId,
      });
    } else {
      setPendingContrib(null);
    }
  }

  async function handleRemind(e: React.MouseEvent, m: MemberDashboardStatus) {
    e.stopPropagation(); // don't open the record sheet
    if (reminding) return;
    setReminding(m.id);
    const result = await sendContributionReminder(groupId, m.id);
    setReminding(null);
    if (result.ok) {
      toast.success(`Reminder sent to ${m.name}`);
    } else {
      toast.error(result.error ?? "Couldn't send reminder");
    }
  }

  const handleSuccess = useCallback(() => {
    setRecordMember(null);
    setIsAdditional(false);
    setPendingContrib(null);
    router.refresh();
  }, [router]);

  // #5 Bulk confirm all pending self-reports at once
  const pendingContribIds = useMemo(
    () => pendingMembers
      .filter((m) => m.isPendingConfirm && !!m.unconfirmedContributionId)
      .map((m) => m.unconfirmedContributionId!),
    [pendingMembers],
  );

  async function handleConfirmAll() {
    if (confirmAllState === "confirming" || pendingContribIds.length === 0) return;
    setConfirmAllState("confirming");
    const result = await confirmContributions({ groupId, contributionIds: pendingContribIds });
    setConfirmAllState("idle");
    if (result.ok) {
      toast.success(`${pendingContribIds.length} payment${pendingContribIds.length !== 1 ? "s" : ""} confirmed ✓`);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to confirm payments");
    }
  }

  // ── Display name ────────────────────────────────────────────────────────────
  function displayName(m: MemberDashboardStatus) {
    return m.id === currentMemberId ? "You" : m.name;
  }

  return (
    <>
      {/* ── Awaiting confirmation banner (admin only) ─────────────────────── */}
      {isAdmin && pendingConfirmCount > 0 && (
        <div className="mb-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20
                        border border-cyan-200/60 dark:border-cyan-700/40 overflow-hidden">

          {/* Normal state */}
          {confirmAllState === "idle" && (
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-base shrink-0">⏳</span>
              <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex-1">
                {pendingConfirmCount === 1
                  ? "1 payment awaiting your confirmation"
                  : `${pendingConfirmCount} payments awaiting your confirmation`}
              </p>
              {/* Show "Confirm all" only when 2+ pending self-reports */}
              {pendingContribIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => setConfirmAllState("confirm-prompt")}
                  className="shrink-0 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300
                             px-2 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-800/40
                             hover:bg-cyan-200 dark:hover:bg-cyan-700/40 transition-colors"
                >
                  Confirm all →
                </button>
              )}
            </div>
          )}

          {/* Confirm-all prompt — inline 2-step */}
          {(confirmAllState === "confirm-prompt" || confirmAllState === "confirming") && (
            <div className="px-3 py-2.5 space-y-2">
              <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                Confirm {pendingContribIds.length} payment{pendingContribIds.length !== 1 ? "s" : ""}?
              </p>
              <p className="text-[11px] text-cyan-600/80 dark:text-cyan-400/70">
                Each member will receive a confirmation notification.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAllState("idle")}
                  disabled={confirmAllState === "confirming"}
                  className="flex-1 py-1.5 text-[11px] font-medium rounded-lg
                             border border-cyan-200 dark:border-cyan-700/60
                             text-cyan-600 dark:text-cyan-400
                             hover:bg-cyan-100/60 dark:hover:bg-cyan-800/30
                             transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAll}
                  disabled={confirmAllState === "confirming"}
                  className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg
                             bg-gradient-to-br from-emerald-500 to-teal-500
                             hover:from-emerald-600 hover:to-teal-600
                             text-white transition-all disabled:opacity-60
                             flex items-center justify-center gap-1.5"
                >
                  {confirmAllState === "confirming"
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Confirming…</>
                    : `Yes, confirm all ✓`}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members…"
          className={`w-full pl-9 pr-8 py-2 text-sm rounded-xl
                     border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-800/60
                     text-slate-800 dark:text-slate-100
                     placeholder:text-slate-400 dark:placeholder:text-slate-500
                     focus:outline-none focus:ring-2 ${inputFocusCls} transition-colors`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center
                       text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Pending section ───────────────────────────────────────────────── */}
      {pendingMembers.length > 0 && (
        <div className="mb-3">
          {/* Section label */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Pending  ({pendingMembers.length})
            </span>
            {amount && !hideAmounts && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                · {formatCurrency(amount, currency)} each
              </span>
            )}
          </div>

          <div className="space-y-1">
            {pendingMembers.map((m) => {
              // Admin can tap ANY pending member:
              //  - Normal pending → opens "Record contribution" form
              //  - isPendingConfirm → opens PaymentPendingBadge (confirm/dispute) mode
              const canRecord  = isAdmin;
              const canRemind  = isAdmin && !m.isGuest && !m.isPendingConfirm && !!m.userId;

              return (
                <div
                  key={m.id}
                  onClick={canRecord ? () => handleRecord(m) : undefined}
                  role={canRecord ? "button" : undefined}
                  tabIndex={canRecord ? 0 : undefined}
                  onKeyDown={canRecord ? (e) => e.key === "Enter" && handleRecord(m) : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all
                    ${canRecord
                      ? `cursor-pointer ${rowHoverCls} active:scale-[0.99]`
                      : ""}
                    ${m.isPendingConfirm
                      ? "bg-cyan-50/60 dark:bg-cyan-900/10 border border-cyan-200/40 dark:border-cyan-700/30"
                      : "bg-slate-50 dark:bg-slate-800/40"}
                  `}
                >
                  {/* Avatar */}
                  {m.isGuest ? (
                    <Ghost className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0
                                    flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Name */}
                  <span className={`text-sm font-medium flex-1 truncate
                    ${m.id === currentMemberId
                      ? youTextCls
                      : "text-slate-700 dark:text-slate-200"}
                  `}>
                    {displayName(m)}
                  </span>

                  {/* "says paid" cyan tag for self-reported members */}
                  {m.isPendingConfirm && (
                    <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-300
                                     bg-cyan-100 dark:bg-cyan-800/40 px-1.5 py-0.5 rounded-full shrink-0">
                      says paid
                    </span>
                  )}

                  {/* Remind bell (only for not-yet-reported pending members) */}
                  {canRemind && (
                    <button
                      type="button"
                      onClick={(e) => handleRemind(e, m)}
                      disabled={reminding === m.id}
                      className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-lg
                                 text-slate-400 ${bellHoverCls}
                                 disabled:opacity-40 transition-colors`}
                      aria-label={`Remind ${m.name}`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Record chevron */}
                  {canRecord && (
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Paid section ──────────────────────────────────────────────────── */}
      {paidMembers.length > 0 && (
        <div>
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setPaidExpanded(!paidExpanded)}
            className="w-full flex items-center gap-2 px-1 py-1.5 rounded-lg
                       hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
          >
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
              Paid  ({paidMembers.length})
            </span>
            {!showPaidRows && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-1 truncate">
                {paidSummary}
              </span>
            )}
            <span className="ml-auto shrink-0">
              {showPaidRows
                ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              }
            </span>
          </button>

          {showPaidRows && (
            <div className="space-y-1 mt-1">
              {paidMembers.map((m) => {
                // One-time mode: admin can record additional contributions on paid members
                const canAddMore = isAdmin && !!isOneTime;

                return (
                  <div
                    key={m.id}
                    onClick={canAddMore ? () => handleRecord(m, true) : undefined}
                    role={canAddMore ? "button" : undefined}
                    tabIndex={canAddMore ? 0 : undefined}
                    onKeyDown={canAddMore ? (e) => e.key === "Enter" && handleRecord(m, true) : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                      bg-emerald-50/50 dark:bg-emerald-900/10
                      ${canAddMore
                        ? "cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.99] transition-all"
                        : ""}
                    `}
                  >
                    {/* Check avatar */}
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 shrink-0
                                    flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    {/* Name */}
                    <span className={`text-sm font-medium flex-1 truncate
                      ${m.id === currentMemberId
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-slate-700 dark:text-slate-200"}
                    `}>
                      {displayName(m)}
                    </span>

                    {/* Date + payment method + amount */}
                    <div className="flex items-center gap-2 shrink-0">
                      {m.contributionDate && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                          {m.paidPaymentMethod
                            ? `${PAYMENT_METHOD_ICONS[m.paidPaymentMethod as PaymentMethod]} `
                            : ""}{m.contributionDate}
                        </span>
                      )}
                      {!hideAmounts && m.contributionAmount && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(m.contributionAmount, currency)}
                        </span>
                      )}
                      {canAddMore && (
                        <span className={`text-[10px] font-bold leading-none ${plusTextCls}`}>
                          +
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Empty search state ────────────────────────────────────────────── */}
      {q && filtered.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
          No members matching &ldquo;{query}&rdquo;
        </p>
      )}

      {/* ── Record contribution sheet ─────────────────────────────────────── */}
      {recordMember && (
        <RecordContributionSheet
          member={recordMember}
          amount={amount ?? 0}
          currency={currency}
          period={period}
          periodLabel={periodLabel}
          groupId={groupId}
          isAdditional={isAdditional}
          isOneTime={isOneTime}
          isOpen={!!recordMember}
          onClose={() => { setRecordMember(null); setIsAdditional(false); setPendingContrib(null); }}
          onSuccess={handleSuccess}
          pendingContribution={pendingContrib ?? undefined}
        />
      )}
    </>
  );
}
