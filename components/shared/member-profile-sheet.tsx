"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, ArrowRight, Receipt, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { fetchMemberStatsAction, type MemberStats } from "@/app/actions/members";
import { MemberAvatar } from "./member-avatar";
import { formatCurrency, getMemberName } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";

interface Props {
  member: GroupMember;
  groupId: string;
  currency: string;
  /** The caller's own member ID — used to detect "self" */
  currentMemberId: string;
  /** Net balance from the balance calculation: positive = owed money, negative = owes money */
  netBalance?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberProfileSheet({
  member,
  groupId,
  currency,
  currentMemberId,
  netBalance,
  isOpen,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
  const [, startFetch] = useTransition();

  useEffect(() => { setMounted(true); }, []);

  // Lazy-load stats when first opened
  useEffect(() => {
    if (!isOpen || stats !== null || statsFailed) return;
    startFetch(async () => {
      try {
        const result = await fetchMemberStatsAction(member.id, groupId);
        setStats(result);
      } catch {
        // Stop the spinner; user can retry by closing and switching to another member
        setStatsFailed(true);
      }
    });
  }, [isOpen, member.id, groupId, stats, statsFailed]);

  // Reset when member changes
  useEffect(() => {
    setStats(null);
    setStatsFailed(false);
  }, [member.id]);

  // Escape key + Android back-button dismissal
  useSheetDismiss(isOpen, onClose);

  if (!mounted) return null;

  const name = getMemberName(member);
  const isSelf = member.id === currentMemberId;
  const isGuest = !!member.guestName && !member.userId;
  const isAdmin = member.role === "admin";

  const hasBalance = netBalance !== undefined && netBalance !== 0;
  const isOwed = (netBalance ?? 0) > 0;   // this member is owed money
  const owes = (netBalance ?? 0) < 0;     // this member owes money

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
                <MemberAvatar name={name} size="lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
                      {isSelf ? `${name} (you)` : name}
                    </p>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                        <Crown className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    )}
                    {isGuest && (
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        Guest
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Net balance banner */}
              {hasBalance && (
                <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                  isOwed
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}>
                  <p className={`text-sm font-medium ${
                    isOwed ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"
                  }`}>
                    {isSelf
                      ? isOwed ? "You are owed" : "You owe"
                      : isOwed ? `${name} is owed` : `${name} owes`}
                  </p>
                  <p className={`text-lg font-semibold tabular ${
                    isOwed ? "text-emerald-700 dark:text-emerald-300" : "text-red-500 dark:text-red-400"
                  }`} style={{ fontFamily: "var(--font-fraunces)" }}>
                    {formatCurrency(Math.abs(netBalance!), currency)}
                  </p>
                </div>
              )}

              {/* Stats */}
              {stats === null ? (
                statsFailed ? (
                  <div className="flex items-center justify-center py-6 text-slate-400 text-sm">
                    Could not load stats.
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                )
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass rounded-xl px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Total paid</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                        {formatCurrency(stats.totalPaid, currency)}
                      </p>
                    </div>
                    <div className="glass rounded-xl px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Total share</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 tabular" style={{ fontFamily: "var(--font-fraunces)" }}>
                        {formatCurrency(stats.totalOwed, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Recent expenses */}
                  {stats.recentExpenses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                        Recent expenses paid
                      </p>
                      <div className="space-y-1.5">
                        {stats.recentExpenses.map((exp) => {
                          const cat = getCategory(exp.category);
                          return (
                            <div key={exp.id} className="glass rounded-xl px-3 py-2.5 flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm ${cat.gradient}`}>
                                <cat.icon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{exp.description}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{exp.expenseDate}</p>
                              </div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0" style={{ fontFamily: "var(--font-fraunces)" }}>
                                {formatCurrency(Number(exp.amount), exp.currency)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {stats.totalPaid === 0 && stats.recentExpenses.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
                      No expenses logged yet.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pt-2 pb-8 shrink-0 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <Link
                href={`/groups/${groupId}/settle`}
                onClick={onClose}
                className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-medium shadow-md shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 transition-all"
              >
                <Receipt className="w-4 h-4" />
                Settle up
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
