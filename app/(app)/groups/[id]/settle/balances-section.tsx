import { Suspense } from "react";
import { getBalances, getSettlements } from "@/lib/db/queries/balances";
import { getMonthlyExpenseSummary } from "@/lib/db/queries/expenses";
import { CountUp } from "@/components/shared/count-up";
import { Skeleton } from "@/components/shared/skeleton";
import { MemberDebtBreakdown } from "@/components/settlement/member-debt-breakdown";
import { SettleBreakdownSection } from "./settle-breakdown-section";
import { MarkPaidButton } from "./mark-paid-button";
import { UpiPayButton } from "./upi-pay-button";
import { WhatsAppRemindButton } from "./whatsapp-remind-button";
import { TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate, getMemberName } from "@/lib/utils";
import type { GroupMember } from "@/lib/db/schema/group-members";

interface Props {
  groupId: string;
  members: GroupMember[];
  currentMemberId: string | undefined;
  currency: string;
  groupName: string;
  settleUrl: string;
  isNest: boolean;
}

export async function BalancesSection({
  groupId,
  members,
  currentMemberId,
  currency,
  groupName,
  settleUrl,
  isNest,
}: Props) {
  const [{ balances, suggestions }, settlementHistory, monthlySummary] = await Promise.all([
    getBalances(groupId),
    getSettlements(groupId),
    getMonthlyExpenseSummary(groupId),
  ]);

  const currentMember = members.find((m) => m.id === currentMemberId);
  const pastSettlementsTotal = settlementHistory.reduce((sum, s) => sum + Number(s.amount), 0);
  const memberName = (memberId: string) => {
    const m = members.find((m) => m.id === memberId);
    return m ? getMemberName(m) : "Member";
  };

  return (
    <>
      {/* Balance summary */}
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        Balances
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        {balances.map((b) => {
          const isPositive = b.net > 0;
          const isZero = b.net === 0;
          return (
            <div key={b.memberId} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isZero ? "bg-slate-100 dark:bg-slate-800" : isPositive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
              }`}>
                {isZero
                  ? <Minus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  : isPositive
                  ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  : <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{b.displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isZero ? "Settled" : isPositive ? "is owed" : "owes"}
                </p>
              </div>
              {isZero ? (
                <span className="text-base font-semibold text-slate-400 dark:text-slate-500 shrink-0" style={{ fontFamily: "var(--font-fraunces)" }}>—</span>
              ) : (
                <CountUp
                  value={Math.abs(b.net)}
                  currency={currency}
                  className={`text-base font-semibold tabular shrink-0 ${isPositive ? "text-emerald-600" : "text-red-500"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly context — nest only */}
      {isNest && monthlySummary && monthlySummary.total > 0 && (
        <div className="glass rounded-xl px-4 py-4 mb-6">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            {monthlySummary.monthLabel} at a glance
          </p>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total spent</p>
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                {formatCurrency(monthlySummary.total, currency)}
              </p>
            </div>
            {currentMember && monthlySummary.byMember[currentMember.id] !== undefined && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your share</p>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {formatCurrency(monthlySummary.byMember[currentMember.id], currency)}
                </p>
              </div>
            )}
            {currentMember && (monthlySummary.byPayer[currentMember.id] ?? 0) > 0 && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">You paid</p>
                <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {formatCurrency(monthlySummary.byPayer[currentMember.id], currency)}
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Running balance below includes all months combined.
          </p>
        </div>
      )}

      {/* Suggested payments */}
      <div data-tour="settle-suggestions">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Suggested payments
        </h2>
        {suggestions.length === 0 ? (
          <div className="glass rounded-xl px-4 py-6 flex flex-col items-center gap-2 mb-8">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">All settled up!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">No payments needed.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-8">
            {suggestions.map((s, i) => (
              <div key={i} className="glass rounded-xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{memberName(s.from)}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{memberName(s.to)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-slate-800 dark:text-slate-100 tabular mr-auto sm:mr-0" style={{ fontFamily: "var(--font-fraunces)" }}>
                    {formatCurrency(s.amount, currency)}
                  </span>
                  {currentMemberId === s.from && (
                    <UpiPayButton amount={s.amount} currency={currency} toName={memberName(s.to)} />
                  )}
                  {currentMemberId === s.to && (
                    <WhatsAppRemindButton
                      fromName={memberName(s.from)}
                      amount={formatCurrency(s.amount, currency)}
                      tripName={groupName}
                      settleUrl={settleUrl}
                    />
                  )}
                  <MarkPaidButton
                    groupId={groupId}
                    fromMemberId={s.from}
                    toMemberId={s.to}
                    amount={s.amount}
                    currency={currency}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-member debt breakdown */}
      <MemberDebtBreakdown members={members} suggestions={suggestions} currency={currency} />

      {/* Expense breakdown — streams in separately */}
      <Suspense fallback={<Skeleton className="h-24 rounded-xl mt-6" />}>
        <SettleBreakdownSection
          groupId={groupId}
          members={members}
          balances={balances}
          suggestions={suggestions}
          currency={currency}
          pastSettlementsTotal={pastSettlementsTotal}
        />
      </Suspense>

      {/* Settlement history */}
      {settlementHistory.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 mt-8">
            Payment history
          </h2>
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
                  <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(s.settledAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
