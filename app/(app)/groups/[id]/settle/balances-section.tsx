import { Suspense } from "react";
import { getBalances, getSettlements } from "@/lib/db/queries/balances";
import { getMonthlyExpenseSummary } from "@/lib/db/queries/expenses";
import { Skeleton } from "@/components/shared/skeleton";
import { SettledCelebration } from "@/components/settlement/settled-celebration";
import { SettleHeroCard } from "@/components/settlement/settle-hero-card";
import { DebtFlowGraph } from "@/components/settlement/debt-flow-graph";
import { SettleBreakdownSection } from "./settle-breakdown-section";
import { MarkPaidButton } from "./mark-paid-button";
import { UpiPayButton } from "./upi-pay-button";
import { WhatsAppRemindButton } from "./whatsapp-remind-button";
import { SettleShareButton } from "@/components/settlement/settle-share-button";
import { ArrowRight, CheckCircle2, AlertTriangle, Send, Clock, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { cn, formatCurrency, formatDate, getMemberName } from "@/lib/utils";
import type { GroupMember } from "@/lib/db/schema/group-members";

interface Props {
  groupId: string;
  members: GroupMember[];
  currentMemberId: string | undefined;
  currency: string;
  groupName: string;
  settleUrl: string;
  inviteUrl: string;
  isNest: boolean;
}

function SectionHeader({ icon: Icon, label, subtitle }: { icon: React.ElementType; label: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0",
          "bg-emerald-50 dark:bg-emerald-900/30")}>
          <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-emerald-200/70 to-transparent dark:from-emerald-800/40 dark:to-transparent" />
      </div>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 pl-9">{subtitle}</p>
      )}
    </div>
  );
}

export async function BalancesSection({
  groupId,
  members,
  currentMemberId,
  currency,
  groupName,
  settleUrl,
  inviteUrl,
  isNest,
}: Props) {
  const [{ balances, suggestions, hasMixedCurrencies }, settlementHistory, monthlySummary] = await Promise.all([
    getBalances(groupId, currency),
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
      {/* Mixed-currency warning */}
      {hasMixedCurrencies && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This group has expenses in multiple currencies. Balances shown in {currency} only — other-currency expenses are excluded.
          </p>
        </div>
      )}

      {/* ── Hero card — personal position ─────────────────────── */}
      <SettleHeroCard
        balances={balances}
        suggestions={suggestions}
        currentMemberId={currentMemberId}
        currency={currency}
        members={members}
      />

      {/* ── Debt flow graph ────────────────────────────────────── */}
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

      {/* ── Monthly context — nest only ────────────────────────── */}
      {isNest && monthlySummary && monthlySummary.total > 0 && (
        <div className="glass rounded-xl px-4 py-4 mb-6">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            {monthlySummary.monthLabel} at a glance
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-sm rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Total spent</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                {formatCurrency(monthlySummary.total, currency)}
              </p>
            </div>
            {currentMember && monthlySummary.byMember[currentMember.id] !== undefined && (
              <div className="glass-sm rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Your share</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {formatCurrency(monthlySummary.byMember[currentMember.id], currency)}
                </p>
              </div>
            )}
            {currentMember && (monthlySummary.byPayer[currentMember.id] ?? 0) > 0 && (
              <div className="glass-sm rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">You paid</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
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

      {/* ── Net balances ───────────────────────────────────────── */}
      {balances.some((b) => b.net !== 0) && (
        <div className="mb-6">
          <SectionHeader icon={BarChart2} label="Net balances" />
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
                  {/* colour dot */}
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isZero ? "bg-slate-300 dark:bg-slate-600"
                    : isPos  ? "bg-emerald-400 dark:bg-emerald-500"
                    :          "bg-amber-400 dark:bg-amber-500",
                  )} />

                  {/* name */}
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {b.displayName}
                    {isYou && (
                      <span className="ml-1.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded-full">
                        you
                      </span>
                    )}
                  </span>

                  {/* net amount */}
                  <span
                    className={cn(
                      "text-sm font-semibold tabular shrink-0",
                      isZero ? "text-slate-400 dark:text-slate-500"
                      : isPos  ? "text-emerald-600 dark:text-emerald-400"
                      :          "text-amber-600 dark:text-amber-400",
                    )}
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {isZero
                      ? "Settled"
                      : `${isPos ? "+" : "−"}${formatCurrency(Math.abs(b.net), currency)}`}
                  </span>

                  {/* trend icon */}
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

      {/* ── Minimum payments ───────────────────────────────────── */}
      <div data-tour="settle-suggestions">
        <SectionHeader
          icon={Send}
          label="Minimum payments"
          subtitle="Transfers that zero out all the balances above"
        />

        {suggestions.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-0.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {suggestions.length} payment{suggestions.length !== 1 ? "s" : ""} to settle
            </p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
              {formatCurrency(suggestions.reduce((sum, s) => sum + s.amount, 0), currency)} total
            </p>
          </div>
        )}

        {suggestions.length === 0 ? (
          <>
            <SettledCelebration groupId={groupId} />
            <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 px-5 py-8 flex flex-col items-center gap-3 mb-8">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800/80 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-center shadow-md shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300" style={{ fontFamily: "var(--font-fraunces)" }}>
                  All settled up!
                </p>
                <p className="text-sm text-emerald-600/75 dark:text-emerald-400/70 mt-1">
                  {pastSettlementsTotal > 0
                    ? `${formatCurrency(pastSettlementsTotal, currency)} tracked and squared away`
                    : "No payments needed right now."}
                </p>
              </div>
              {settlementHistory.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-600/55 dark:text-emerald-400/50">
                  <span>{settlementHistory.length} payment{settlementHistory.length !== 1 ? "s" : ""} recorded</span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400/60 dark:bg-emerald-600/60 inline-block" />
                  <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2 mb-8">
            {suggestions.map((s, i) => {
              const isYouFrom = currentMemberId === s.from;
              const isYouTo = currentMemberId === s.to;
              const isYours = isYouFrom || isYouTo;
              return (
                <div
                  key={i}
                  id={`suggestion-${i}`}
                  className={`glass rounded-xl px-4 py-3.5 flex flex-col gap-2.5 ${
                    isYouFrom
                      ? "ring-2 ring-amber-400/50 dark:ring-amber-500/40 bg-amber-50/40 dark:bg-amber-900/10"
                      : isYouTo
                      ? "ring-2 ring-emerald-400/40 dark:ring-emerald-500/30"
                      : ""
                  }`}
                >
                  {isYours && (
                    <span className={`self-start text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isYouFrom
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    }`}>
                      {isYouFrom ? "You owe" : "Owed to you"}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate min-w-0">
                      {memberName(s.from)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate min-w-0 flex-1">
                      {memberName(s.to)}
                    </span>
                    <span
                      className={`text-lg font-semibold tabular shrink-0 ${
                        isYouFrom ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                      style={{ fontFamily: "var(--font-fraunces)" }}
                    >
                      {formatCurrency(s.amount, currency)}
                    </span>
                  </div>
                  {(currentMemberId === s.from || currentMemberId === s.to) && (
                    <div className="flex items-center gap-2 flex-wrap">
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
                      <SettleShareButton
                        fromName={memberName(s.from)}
                        toName={memberName(s.to)}
                        amount={s.amount}
                        currency={currency}
                        direction={currentMemberId === s.from ? "owe" : "owed"}
                        groupName={groupName}
                        settleUrl={inviteUrl}
                      />
                    </div>
                  )}
                  {currentMemberId !== s.from && currentMemberId !== s.to && (
                    <div className="flex items-center gap-2">
                      <MarkPaidButton
                        groupId={groupId}
                        fromMemberId={s.from}
                        toMemberId={s.to}
                        amount={s.amount}
                        currency={currency}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Expense breakdown — streamed ───────────────────────── */}
      <Suspense fallback={<Skeleton className="h-24 rounded-xl mt-6" />}>
        <SettleBreakdownSection
          groupId={groupId}
          members={members}
          currency={currency}
        />
      </Suspense>

      {/* ── Payment history ────────────────────────────────────── */}
      {settlementHistory.length > 0 && (
        <>
          <div className="mt-8">
            <SectionHeader icon={Clock} label="Payment history" />
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
