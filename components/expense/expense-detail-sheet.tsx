"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Receipt } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { ExpenseSplit } from "@/lib/db/schema/expense-splits";
import { getCategory } from "@/lib/categories";
import { formatCurrency, formatDate, getMemberName } from "@/lib/utils";
import { fetchExpenseSplitsAction } from "@/app/actions/expenses";

interface Props {
  expense: Expense;
  members: GroupMember[];
  currentUserId: string;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseDetailSheet({ expense, members, currentUserId, isAdmin, isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [splits, setSplits] = useState<ExpenseSplit[] | null>(null);
  const [, startFetch] = useTransition();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || splits !== null) return;
    startFetch(async () => {
      const result = await fetchExpenseSplitsAction(expense.id);
      setSplits(result ?? []);
    });
  }, [isOpen, expense.id, splits]);

  // Reset splits when expense changes
  useEffect(() => { setSplits(null); }, [expense.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const payer = members.find((m) => m.id === expense.paidByMemberId);
  const creator = members.find((m) => m.userId === expense.createdByUserId);
  const editor = expense.updatedByUserId
    ? members.find((m) => m.userId === expense.updatedByUserId)
    : null;
  const catMeta = getCategory(expense.category);
  const canEdit = expense.createdByUserId === currentUserId || isAdmin;
  const dateDisplay =
    expense.category === "accommodation" && expense.endDate
      ? `${formatDate(expense.expenseDate)} – ${formatDate(expense.endDate)}`
      : formatDate(expense.expenseDate);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[80vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${catMeta.color}`}>
                  <catMeta.icon className={`w-4 h-4 ${catMeta.textColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate" style={{ fontFamily: "var(--font-fraunces)" }}>
                    {expense.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{catMeta.label} · {dateDisplay}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Amount + payer */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Paid by</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {payer ? getMemberName(payer) : "Member"}
                  </p>
                </div>
                <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {formatCurrency(Number(expense.amount), expense.currency)}
                </p>
              </div>

              {/* Notes */}
              {expense.notes && (
                <div className="glass rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{expense.notes}</p>
                </div>
              )}

              {/* Split breakdown */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Split
                </p>
                {splits === null ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin" />
                    Loading split…
                  </div>
                ) : splits.length === 0 ? (
                  <p className="text-sm text-slate-400">No split data available.</p>
                ) : (
                  <div className="space-y-1.5">
                    {splits.map((split) => {
                      const member = members.find((m) => m.id === split.memberId);
                      return (
                        <div key={split.id} className="flex items-center justify-between py-1">
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            {member ? getMemberName(member) : "Member"}
                          </p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 tabular">
                            {formatCurrency(Number(split.shareAmount), expense.currency)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Audit trail */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Added by {creator ? getMemberName(creator) : "Member"} · {formatDistanceToNow(expense.createdAt, { addSuffix: true })}
                </p>
                {editor && expense.updatedByUserId !== expense.createdByUserId && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Edited by {getMemberName(editor)} · {formatDistanceToNow(expense.updatedAt, { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-5 pt-2 pb-8 shrink-0 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              {canEdit && (
                <Link
                  href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                  onClick={onClose}
                  className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-medium shadow-md shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 transition-all"
                >
                  <Pencil className="w-4 h-4" />
                  Edit expense
                </Link>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
