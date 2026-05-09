"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Transaction } from "@/lib/settle/optimize";
import type { TripMember } from "@/lib/db/schema/trip-members";
import { getMemberName, formatCurrency } from "@/lib/utils";
import { MemberAvatar } from "@/components/shared/member-avatar";

interface Props {
  members: TripMember[];
  suggestions: Transaction[];
  currency: string;
}

export function MemberDebtBreakdown({ members, suggestions, currency }: Props) {
  const [open, setOpen] = useState(false);

  const nameOf = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m ? getMemberName(m) : "Member";
  };

  if (suggestions.length === 0) return null;

  // For each member, collect what they owe and what they're owed
  const memberIds = [...new Set([...suggestions.map((s) => s.from), ...suggestions.map((s) => s.to)])];

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 glass rounded-xl hover:shadow-md transition-all text-sm font-medium text-slate-600 dark:text-slate-300"
      >
        <span className="flex items-center gap-2">
          <span className="text-cyan-500 font-semibold">↔</span>
          Who owes whom — per member
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
            <div className="pt-3 space-y-3">
              {members.map((member) => {
                const memberId = member.id;
                const owes = suggestions.filter((s) => s.from === memberId);
                const isOwed = suggestions.filter((s) => s.to === memberId);
                const isSettled = owes.length === 0 && isOwed.length === 0;

                return (
                  <div key={memberId} className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MemberAvatar name={getMemberName(member)} size="sm" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{getMemberName(member)}</span>
                      {isSettled && (
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                        </span>
                      )}
                    </div>

                    {owes.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {owes.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-xs text-red-500 dark:text-red-400 font-medium w-7 text-right">owes</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className="text-slate-600 dark:text-slate-300 flex-1">{nameOf(t.to)}</span>
                            <span className="font-semibold text-red-500 dark:text-red-400 tabular">{formatCurrency(t.amount, currency)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isOwed.length > 0 && (
                      <div className="space-y-1.5">
                        {isOwed.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium w-7 text-right">gets</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className="text-slate-600 dark:text-slate-300 flex-1">{nameOf(t.from)}</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular">{formatCurrency(t.amount, currency)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
