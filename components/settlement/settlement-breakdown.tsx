"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CategoryIcon } from "@/components/expense/category-icon";
import { formatCurrency, getMemberName } from "@/lib/utils";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { Expense } from "@/lib/db/schema/expenses";
import type { ExpenseSplit } from "@/lib/db/schema/expense-splits";
import type { MemberBalanceRow } from "@/lib/db/queries/balances";
import type { Transaction } from "@/lib/settle/optimize";

interface Props {
  expensesWithSplits: { expense: Expense; splits: ExpenseSplit[] }[];
  members: GroupMember[];
  balances: MemberBalanceRow[];
  suggestions: Transaction[];
  currency: string;
  pastSettlementsTotal: number;
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm shadow-cyan-500/30">
      {n}
    </div>
  );
}

export function SettlementBreakdown({
  expensesWithSplits,
  members,
  balances,
  suggestions,
  currency,
  pastSettlementsTotal,
}: Props) {
  const [open, setOpen] = useState(false);

  const nameOf = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m ? getMemberName(m) : "Member";
  };

  if (expensesWithSplits.length === 0) return null;

  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 glass rounded-xl hover:shadow-md transition-all text-sm font-medium text-slate-600 dark:text-slate-300"
      >
        <span className="flex items-center gap-2">
          <span className="text-cyan-500 font-semibold">?</span>
          How is this calculated?
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-6">

              {/* ── Step 1: Expense Ledger ───────────────────────────── */}
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <StepBadge n={1} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Expense ledger</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Every expense and how it was split</p>
                  </div>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {expensesWithSplits.map(({ expense, splits }) => {
                    const payer = nameOf(expense.paidByMemberId);
                    return (
                      <div key={expense.id} className="border-b border-slate-100 dark:border-slate-700/50 pb-3 last:border-0 last:pb-0">
                        {/* Expense header */}
                        <div className="flex items-center gap-2 mb-2">
                          <CategoryIcon category={expense.category} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{expense.description}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{payer} paid</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular shrink-0"
                            style={{ fontFamily: "var(--font-fraunces)" }}>
                            {formatCurrency(Number(expense.amount), expense.currency)}
                          </p>
                        </div>

                        {/* Splits */}
                        <div className="ml-10 space-y-1">
                          {splits.map((split, i) => {
                            const isLast = i === splits.length - 1;
                            return (
                              <div key={split.id} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span className="text-slate-300 dark:text-slate-600">{isLast ? "└" : "├"}──</span>
                                <span className="flex-1">{nameOf(split.memberId)}</span>
                                <span className="tabular font-medium text-slate-600 dark:text-slate-300">
                                  {formatCurrency(Number(split.shareAmount), expense.currency)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Step 2: Balance Sheet ────────────────────────────── */}
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-1">
                  <StepBadge n={2} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Balance sheet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Paid for group &minus; Your share = Net balance
                    </p>
                  </div>
                </div>

                {/* Formula callout */}
                <div className="mx-0 mt-3 mb-4 px-3 py-2 bg-cyan-50 dark:bg-cyan-950/40 rounded-lg border border-cyan-100 dark:border-cyan-900/50 text-xs text-cyan-700 dark:text-cyan-300 font-medium">
                  Net = Amount paid &minus; Share owed
                  {pastSettlementsTotal > 0 && (
                    <span className="block mt-0.5 font-normal text-cyan-600 dark:text-cyan-400">
                      Adjusted for {formatCurrency(pastSettlementsTotal, currency)} already settled
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto -mx-1">
                  <table className="w-full min-w-[340px] text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left pb-2 font-medium">Member</th>
                        <th className="text-right pb-2 font-medium whitespace-nowrap">Paid</th>
                        <th className="text-right pb-2 font-medium whitespace-nowrap">Share owed</th>
                        <th className="text-right pb-2 font-medium whitespace-nowrap">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {balances.map((b) => {
                        const rawNet = b.totalPaid - b.totalOwed;
                        const isPos = b.net > 0;
                        const isZero = b.net === 0;
                        return (
                          <tr key={b.memberId}>
                            <td className="py-2 text-slate-700 dark:text-slate-200 font-medium max-w-[100px] truncate">{b.displayName}</td>
                            <td className="py-2 text-right tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {formatCurrency(b.totalPaid, currency)}
                            </td>
                            <td className="py-2 text-right tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {formatCurrency(b.totalOwed, currency)}
                            </td>
                            <td className="py-2 text-right tabular">
                              <span className={`inline-flex items-center gap-1 font-semibold ${
                                isZero ? "text-slate-400 dark:text-slate-500" : isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                              }`} style={{ fontFamily: "var(--font-fraunces)" }}>
                                {isZero
                                  ? <><Minus className="w-3 h-3" /> Settled</>
                                  : isPos
                                  ? <><TrendingUp className="w-3 h-3" />{formatCurrency(Math.abs(b.net), currency)}</>
                                  : <><TrendingDown className="w-3 h-3" />{formatCurrency(Math.abs(b.net), currency)}</>
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Step 3: Settlement Flow ──────────────────────────── */}
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <StepBadge n={3} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Minimum payments</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {suggestions.length === 0
                        ? "Everyone is settled — no payments needed"
                        : `${suggestions.length} payment${suggestions.length > 1 ? "s" : ""} to clear all balances (the mathematical minimum)`}
                    </p>
                  </div>
                </div>

                {suggestions.length === 0 ? (
                  <div className="text-center py-4 text-emerald-600 text-sm font-medium">
                    ✓ All squared up
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {/* From */}
                        <div className="flex-1 text-right">
                          <span className="inline-block bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-900/50">
                            {nameOf(s.from)}
                          </span>
                        </div>

                        {/* Arrow + amount */}
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular">
                            {formatCurrency(s.amount, currency)}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <div className="w-10 h-px bg-slate-300 dark:bg-slate-600" />
                            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          </div>
                        </div>

                        {/* To */}
                        <div className="flex-1 text-left">
                          <span className="inline-block bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                            {nameOf(s.to)}
                          </span>
                        </div>
                      </div>
                    ))}

                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
                      {members.length} members · {suggestions.length} of {members.length - 1} max possible transactions
                    </p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
