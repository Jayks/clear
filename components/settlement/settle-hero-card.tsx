"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";
import { CountUp } from "@/components/shared/count-up";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { formatCurrency, getMemberName } from "@/lib/utils";
import type { Transaction } from "@/lib/settle/optimize";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { MemberBalanceRow } from "@/lib/db/queries/balances";

interface Props {
  balances: MemberBalanceRow[];
  suggestions: Transaction[];
  currentMemberId: string | undefined;
  currency: string;
  members: GroupMember[];
}

const container: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      staggerChildren: 0.06,
    },
  },
};

const row: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

const pill: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 24 },
  },
};

export function SettleHeroCard({ balances, suggestions, currentMemberId, currency, members }: Props) {
  const [countActive, setCountActive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCountActive(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!currentMemberId) return null;

  const myBalance = balances.find((b) => b.memberId === currentMemberId);
  if (!myBalance) return null;

  // Fully settled state is handled by SettledCelebration — don't render
  if (suggestions.length === 0) return null;

  const net = myBalance.net;
  const isOwe  = net < 0;   // I owe money
  const isOwed = net > 0;   // money owed to me

  const iOwe    = suggestions.filter((s) => s.from === currentMemberId);
  const owedToMe = suggestions.filter((s) => s.to   === currentMemberId);

  const memberName = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m ? getMemberName(m) : "Member";
  };

  const StatusIcon = isOwe ? TrendingDown : isOwed ? TrendingUp : CheckCircle2;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="relative glass rounded-2xl px-5 pt-4 pb-4 mb-6 overflow-hidden"
    >
      {/* ── Left accent bar — the ONLY colour on the card container ── */}
      <div
        className={`absolute left-0 inset-y-0 w-[3px] ${
          isOwe
            ? "bg-amber-400 dark:bg-amber-500"
            : isOwed
            ? "bg-emerald-400 dark:bg-emerald-500"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      />

      {/* ── Status row: tiny icon badge + muted label ─────────── */}
      <motion.div variants={row} className="flex items-center gap-2 mb-3 pl-1">
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
            isOwe
              ? "bg-amber-100 dark:bg-amber-900/40"
              : isOwed
              ? "bg-emerald-100 dark:bg-emerald-900/40"
              : "bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <StatusIcon
            className={`w-3 h-3 ${
              isOwe
                ? "text-amber-500 dark:text-amber-400"
                : isOwed
                ? "text-emerald-500 dark:text-emerald-400"
                : "text-slate-400 dark:text-slate-500"
            }`}
          />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          {isOwe ? "You owe" : isOwed ? "You're owed" : "You're settled"}
        </span>
      </motion.div>

      {/* ── Amount — large, neutral typography ─────────────────── */}
      <motion.div variants={row} className="mb-4 pl-1">
        <span style={{ fontFamily: "var(--font-fraunces)" }}>
          <CountUp
            value={countActive ? Math.abs(net) : 0}
            currency={currency}
            duration={0.8}
            className="text-[2.25rem] font-bold tabular leading-none text-slate-800 dark:text-slate-100"
          />
        </span>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          {isOwe
            ? `${iOwe.length} payment${iOwe.length !== 1 ? "s" : ""} outstanding`
            : isOwed
            ? `from ${owedToMe.length} member${owedToMe.length !== 1 ? "s" : ""}`
            : "Others in the group still have pending payments"}
        </p>
      </motion.div>

      {/* ── Person pills — glass-sm base, only the amount is coloured ─ */}
      {(iOwe.length > 0 || owedToMe.length > 0) && (
        <motion.div variants={row} className="flex flex-wrap gap-1.5 pl-1">
          {iOwe.map((t, i) => (
            <motion.div
              key={`owe-${i}`}
              variants={pill}
              className="flex items-center gap-1.5 glass-sm rounded-full pl-1 pr-2.5 py-1"
            >
              <MemberAvatar name={memberName(t.to)} size="sm" className="!w-5 !h-5 !text-[8px]" />
              <span className="text-xs text-slate-600 dark:text-slate-300 leading-none">
                {memberName(t.to)}
              </span>
              <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 tabular leading-none">
                {formatCurrency(t.amount, currency)}
              </span>
            </motion.div>
          ))}
          {owedToMe.map((t, i) => (
            <motion.div
              key={`owed-${i}`}
              variants={pill}
              className="flex items-center gap-1.5 glass-sm rounded-full pl-1 pr-2.5 py-1"
            >
              <MemberAvatar name={memberName(t.from)} size="sm" className="!w-5 !h-5 !text-[8px]" />
              <span className="text-xs text-slate-600 dark:text-slate-300 leading-none">
                {memberName(t.from)}
              </span>
              <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 tabular leading-none">
                {formatCurrency(t.amount, currency)}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
