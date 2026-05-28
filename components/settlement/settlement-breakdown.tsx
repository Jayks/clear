"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/expense/category-icon";
import { formatCurrency, getMemberName } from "@/lib/utils";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { Expense } from "@/lib/db/schema/expenses";
import type { ExpenseSplit } from "@/lib/db/schema/expense-splits";

interface Props {
  expensesWithSplits: { expense: Expense; splits: ExpenseSplit[] }[];
  members: GroupMember[];
  currency: string;
}

export function SettlementBreakdown({ expensesWithSplits, members, currency }: Props) {
  const [open, setOpen] = useState(false);

  const nameOf = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m ? getMemberName(m) : "Member";
  };

  if (expensesWithSplits.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 glass rounded-xl hover:shadow-md transition-all text-sm font-medium text-slate-600 dark:text-slate-300"
      >
        <span className="flex items-center gap-2">
          <span className="text-slate-400 dark:text-slate-500 font-semibold text-base leading-none">÷</span>
          How were expenses split?
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
            <div className="pt-4">
              <div className="glass rounded-2xl p-5">
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {expensesWithSplits.map(({ expense, splits }) => {
                    const payer = nameOf(expense.paidByMemberId);
                    return (
                      <div
                        key={expense.id}
                        className="border-b border-slate-100 dark:border-slate-700/50 pb-3 last:border-0 last:pb-0"
                      >
                        {/* Expense header */}
                        <div className="flex items-center gap-2 mb-2">
                          <CategoryIcon category={expense.category} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                              {expense.description}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {payer} paid
                            </p>
                          </div>
                          <p
                            className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular shrink-0"
                            style={{ fontFamily: "var(--font-fraunces)" }}
                          >
                            {formatCurrency(Number(expense.amount), expense.currency)}
                          </p>
                        </div>

                        {/* Per-member splits */}
                        <div className="ml-10 space-y-1">
                          {splits.map((split, i) => {
                            const isLast = i === splits.length - 1;
                            return (
                              <div
                                key={split.id}
                                className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                              >
                                <span className="text-slate-300 dark:text-slate-600">
                                  {isLast ? "└" : "├"}──
                                </span>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
