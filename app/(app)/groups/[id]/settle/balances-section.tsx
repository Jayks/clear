import { Suspense } from "react";
import { getBalances, getSettlements, getSettlementsTotal } from "@/lib/db/queries/balances";
import { countNaivePairwiseTransactions } from "@/lib/settle/optimize";
import { getMonthlyExpenseSummary } from "@/lib/db/queries/expenses";
import { Skeleton } from "@/components/shared/skeleton";
// SettleHeroCard now rendered inside SettleActionsClient (shared optimistic state)
import { DebtFlowGraph } from "@/components/settlement/debt-flow-graph";
import { SettleBreakdownSection } from "./settle-breakdown-section";
import { SettleActionsClient } from "./settle-actions-client";
import { SectionHeader } from "@/components/shared/section-header";
import type { ContextTheme } from "@/lib/theme/context-theme";
import {
  ArrowRight, CheckCircle2, AlertTriangle,
  Clock, TrendingUp, TrendingDown, BarChart2,
} from "lucide-react";
import { cn, formatCurrency, formatDate, getMemberName } from "@/lib/utils";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { PendingSettlement } from "@/lib/db/queries/settlements";
import type { PaymentRequest } from "@/lib/db/schema/payment-requests";
import { PAYMENT_METHOD_ICONS } from "@/lib/payment/types";
import type { PaymentMethod } from "@/lib/payment/types";

interface Props {
  groupId:             string;
  members:             GroupMember[];
  currentMemberId:     string | undefined;
  currentUserId:       string | undefined;
  isAdmin:             boolean;
  currency:            string;
  groupName:           string;
  settleUrl:           string;
  inviteUrl:           string;
  isNest:              boolean;
  /** Context palette — colour identifies the group, the section icon the page. */
  theme:               ContextTheme;
  /** userId → default VPA string | null */
  upiIdMap:            Record<string, string | null>;
  pendingSettlements:  PendingSettlement[];
  /** Self-reported payment requests from ghost members (trip/nest only) */
  pendingExternalPayments: PaymentRequest[];
  /** App base URL for building payment request links */
  appUrl:              string;
  /** "trip" | "nest" — tells SuggestionCards which contextType to pass to generatePaymentRequest */
  contextType:         "trip" | "nest";
  /** Settlement ID from ?confirm= push-notification deep link */
  confirmId?:          string;
}

export async function BalancesSection({
  groupId, members, currentMemberId, currentUserId, isAdmin,
  currency, groupName, settleUrl, inviteUrl, isNest, contextType, theme,
  upiIdMap, pendingSettlements, pendingExternalPayments, appUrl, confirmId,
}: Props) {
  const [{ balances, suggestions, hasMixedCurrencies }, allSettlements, pastSettlementsTotal, monthlySummary] = await Promise.all([
    getBalances(groupId, currency),
    getSettlements(groupId),
    getSettlementsTotal(groupId),  // aggregate query — not affected by the 100-row display limit
    getMonthlyExpenseSummary(groupId),
  ]);

  // History = confirmed settlements only (pending ones shown in PendingConfirmations above)
  const settlementHistory = allSettlements.filter((s) => s.isConfirmed);

  const memberName = (memberId: string) => {
    const m = members.find((m) => m.id === memberId);
    return m ? getMemberName(m) : "Member";
  };

  // Naive pairwise baseline for the "N instead of M — we netted out the rest" trust
  // copy on the suggestion cards. Computed once from the page-load balances.
  const naiveCount = countNaivePairwiseTransactions(balances);

  return (
    <>
      {/* Mixed-currency warning */}
      {hasMixedCurrencies && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This group has expenses in multiple currencies. Balances shown in {currency} only — other-currency expenses are excluded.
          </p>
        </div>
      )}

      {/* ── Hero card + actions — single client boundary with shared optimistic state ── */}
      {/*
       * SettleActionsClient owns the hero card, both pending-confirmation sections,
       * and suggestion cards — all update instantly when a payment is confirmed
       * (no waiting for router.refresh()).
       * RSC-rendered content (DebtFlowGraph, monthly context, net balances)
       * is passed as children — server-rendered, static until router.refresh().
       */}
      <SettleActionsClient
        balances={balances}
        pendingSettlements={pendingSettlements}
        focusId={confirmId}
        pendingExternalPayments={pendingExternalPayments}
        groupId={groupId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        currency={currency}
        suggestions={suggestions}
        naiveCount={naiveCount}
        members={members}
        currentMemberId={currentMemberId}
        groupName={groupName}
        upiIdMap={upiIdMap}
        settleUrl={settleUrl}
        inviteUrl={inviteUrl}
        pastSettlementsTotal={pastSettlementsTotal}
        settlementCount={settlementHistory.length}
        contextType={contextType}
        appUrl={appUrl}
        theme={theme}
      >
        {/* ── Debt flow graph ──────────────────────────────────── */}
        {members.length > 1 && (
          <div data-tour="debt-flow-graph">
            <DebtFlowGraph
              suggestions={suggestions}
              members={members}
              balances={balances}
              currentMemberId={currentMemberId}
              currency={currency}
              groupId={groupId}
            />
          </div>
        )}

        {/* ── Monthly context — nest only ──────────────────────── */}
        {isNest && monthlySummary && monthlySummary.total > 0 && (
          <div className="glass rounded-xl px-4 py-4 mb-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              {monthlySummary.monthLabel} at a glance
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="glass-sm rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Total spent</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular"
                   style={{ fontFamily: "var(--font-fraunces)" }}>
                  {formatCurrency(monthlySummary.total, currency)}
                </p>
              </div>
              {currentMemberId && monthlySummary.byMember[currentMemberId] !== undefined && (
                <div className="glass-sm rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Your share</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular"
                     style={{ fontFamily: "var(--font-fraunces)" }}>
                    {formatCurrency(monthlySummary.byMember[currentMemberId], currency)}
                  </p>
                </div>
              )}
              {currentMemberId && (monthlySummary.byPayer[currentMemberId] ?? 0) > 0 && (
                <div className="glass-sm rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">You paid</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular"
                     style={{ fontFamily: "var(--font-fraunces)" }}>
                    {formatCurrency(monthlySummary.byPayer[currentMemberId], currency)}
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Running balance below includes all months combined.
            </p>
          </div>
        )}

        {/* ── Net balances ─────────────────────────────────────── */}
        {balances.some((b) => b.net !== 0) && (
          <div className="mb-6">
            <SectionHeader icon={BarChart2} label="Net balances" theme={theme} className="mb-4" />
            <div className="glass rounded-2xl overflow-hidden">
              {balances.map((b, i) => {
                const isPos  = b.net > 0;
                const isZero = b.net === 0;
                const isYou  = b.memberId === currentMemberId;
                return (
                  <div
                    key={b.memberId}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i < balances.length - 1 && "border-b border-slate-100 dark:border-slate-700/50",
                      isYou && "bg-cyan-50/40 dark:bg-cyan-900/10",
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isZero ? "bg-slate-300 dark:bg-slate-600"
                      : isPos  ? "bg-emerald-400 dark:bg-emerald-500"
                      :          "bg-amber-400 dark:bg-amber-500",
                    )} />
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {b.displayName}
                      {isYou && (
                        <span className="ml-1.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded-full">
                          you
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular shrink-0",
                        isZero ? "text-slate-400 dark:text-slate-500"
                        : isPos  ? "text-emerald-600 dark:text-emerald-400"
                        :          "text-amber-600 dark:text-amber-400",
                      )}
                      style={{ fontFamily: "var(--font-fraunces)" }}
                    >
                      {isZero ? "Settled" : `${isPos ? "+" : "−"}${formatCurrency(Math.abs(b.net), currency)}`}
                    </span>
                    {!isZero && (
                      isPos
                        ? <TrendingUp   className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        : <TrendingDown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </SettleActionsClient>

      {/* ── Expense breakdown — streamed ───────────────────────── */}
      <Suspense fallback={<Skeleton className="h-24 rounded-xl mt-6" />}>
        <SettleBreakdownSection
          groupId={groupId}
          members={members}
          currency={currency}
        />
      </Suspense>

      {/* ── Payment history (confirmed only) ──────────────────── */}
      {settlementHistory.length > 0 && (
        <>
          <div className="mt-8">
            <SectionHeader icon={Clock} label="Payment history" theme={theme} className="mb-4" />
          </div>
          <div className="space-y-2">
            {settlementHistory.map((s) => (
              <div key={s.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3 opacity-75">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium truncate">{memberName(s.fromMemberId)}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="font-medium truncate">{memberName(s.toMemberId)}</span>
                  </div>
                  {s.note && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{s.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular">
                    {formatCurrency(Number(s.amount), s.currency)}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {s.paymentMethod
                      ? `${PAYMENT_METHOD_ICONS[s.paymentMethod as PaymentMethod]} `
                      : ""}{formatDate(s.settledAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
