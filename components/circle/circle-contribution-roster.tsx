"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronDown, ChevronUp, ChevronRight, Ghost, Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { RecordContributionSheet } from "./record-contribution-sheet";
import { sendContributionReminder } from "@/app/actions/circle";
import { formatCurrency } from "@/lib/utils";
import type { MemberDashboardStatus, PendingMember } from "@/lib/db/queries/circle";

interface Props {
  members:         MemberDashboardStatus[];
  isAdmin:         boolean;
  currentMemberId: string | null;
  amount:          number | null;
  currency:        string;
  period:          string | null;
  periodLabel:     string | null;
  groupId:         string;
  isGoal?:         boolean;
  hideAmounts?:    boolean;   // admin_only privacy — hide ₹ totals from non-admin members
}

export function CircleContributionRoster({
  members, isAdmin, currentMemberId, amount, currency, period, periodLabel,
  groupId, isGoal, hideAmounts,
}: Props) {
  const router = useRouter();

  const [query,        setQuery]        = useState("");
  const [paidExpanded, setPaidExpanded] = useState(false);
  const [recordMember, setRecordMember] = useState<PendingMember | null>(null);
  const [isAdditional, setIsAdditional] = useState(false);
  const [reminding,    setReminding]    = useState<string | null>(null); // memberId being reminded

  const q = query.toLowerCase().trim();

  // ── Filter members by search ────────────────────────────────────────────────
  const filtered = useMemo(
    () => q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members,
    [members, q],
  );

  const pendingMembers = filtered.filter((m) => !m.isPaid);
  const paidMembers    = filtered.filter((m) => m.isPaid);

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
    router.refresh();
  }, [router]);

  // ── Display name ────────────────────────────────────────────────────────────
  function displayName(m: MemberDashboardStatus) {
    return m.id === currentMemberId ? "You" : m.name;
  }

  return (
    <>
      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members…"
          className="w-full pl-9 pr-8 py-2 text-sm rounded-xl
                     border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-800/60
                     text-slate-800 dark:text-slate-100
                     placeholder:text-slate-400 dark:placeholder:text-slate-500
                     focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400
                     dark:focus:border-violet-600 transition-colors"
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
              // isPendingConfirm = self-reported, awaiting admin confirm via batch banner
              const canRecord  = isAdmin && !m.isPendingConfirm;
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
                      ? "cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20 active:scale-[0.99]"
                      : ""}
                    ${m.isPendingConfirm
                      ? "bg-amber-50/60 dark:bg-amber-900/10"
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
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-slate-700 dark:text-slate-200"}
                  `}>
                    {displayName(m)}
                  </span>

                  {/* "says paid" amber tag for self-reported members */}
                  {m.isPendingConfirm && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400
                                     bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full shrink-0">
                      says paid
                    </span>
                  )}

                  {/* Remind bell */}
                  {canRemind && (
                    <button
                      type="button"
                      onClick={(e) => handleRemind(e, m)}
                      disabled={reminding === m.id}
                      className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg
                                 text-slate-400 hover:text-violet-500 dark:hover:text-violet-400
                                 hover:bg-violet-50 dark:hover:bg-violet-900/20
                                 disabled:opacity-40 transition-colors"
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
                // Goal mode: admin can record additional contributions on paid members
                const canAddMore = isAdmin && !!isGoal;

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

                    {/* Date + amount */}
                    <div className="flex items-center gap-2 shrink-0">
                      {m.contributionDate && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                          {m.contributionDate}
                        </span>
                      )}
                      {!hideAmounts && m.contributionAmount && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(m.contributionAmount, currency)}
                        </span>
                      )}
                      {canAddMore && (
                        <span className="text-[10px] font-bold text-violet-500 dark:text-violet-400 leading-none">
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
          isOpen={!!recordMember}
          onClose={() => { setRecordMember(null); setIsAdditional(false); }}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
