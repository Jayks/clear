"use client";

/**
 * HomeBalanceStrip — the directional net-position strip under the Home greeting.
 * Reuses the app's existing balance grammar (emerald = owed, amber = owe, muted
 * "All settled ✓") rather than inventing a blended net number. Depth (per-group
 * breakdown) lives behind a tap so the resting state stays a single line.
 */

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Home, ChevronDown, ChevronRight, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { HomeBalanceSummary } from "@/lib/home/balance-summary";

const TYPE_BADGE: Record<string, { icon: LucideIcon; gradient: string }> = {
  trip: { icon: MapPin, gradient: "from-cyan-500 to-teal-500" },
  nest: { icon: Home, gradient: "from-emerald-500 to-teal-500" },
};

export function HomeBalanceStrip({ summary }: { summary: HomeBalanceSummary }) {
  const [expanded, setExpanded] = useState(false);

  // ── Settled — quiet reassurance, not interactive ────────────────────────────
  if (summary.state === "settled") {
    return (
      <div className="mb-6 flex items-center gap-1.5 text-sm font-medium text-emerald-600/80 dark:text-emerald-500/70">
        <Check className="w-4 h-4 shrink-0" />
        You&apos;re all settled up
      </div>
    );
  }

  const { totalOwed, totalOwe, currency, otherCurrencyCount, rows, groupsWithBalance } = summary;
  const expandable = groupsWithBalance >= 2;

  // The resting pill row — shared between the single-group (Link) and
  // multi-group (toggle button) cases.
  const pills = (
    <div className="flex items-center gap-2 flex-wrap min-w-0">
      {totalOwed > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium
                         bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          Owed {formatCurrency(totalOwed, currency)}
        </span>
      )}
      {totalOwe > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium
                         bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
          You owe {formatCurrency(totalOwe, currency)}
        </span>
      )}
      {otherCurrencyCount > 0 && (
        <span className="text-xs text-slate-400 dark:text-slate-500">
          · +{otherCurrencyCount} other {otherCurrencyCount === 1 ? "currency" : "currencies"}
        </span>
      )}
    </div>
  );

  // ── Single balance — tap goes straight to that group's settle page ──────────
  if (!expandable) {
    return (
      <Link
        href={`/groups/${rows[0].groupId}/settle`}
        className="mb-6 flex items-center justify-between gap-2 group min-h-[44px]"
      >
        {pills}
        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0
                                 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
      </Link>
    );
  }

  // ── Multiple balances — expandable breakdown ────────────────────────────────
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "Hide balance breakdown" : "Show balance breakdown"}
        className="w-full flex items-center justify-between gap-2 min-h-[44px] text-left"
      >
        {pills}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform
                      ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-0.5">
              {rows.map((row) => {
                const badge = TYPE_BADGE[row.groupType] ?? TYPE_BADGE.trip;
                const Icon = badge.icon;
                const isOwed = row.net > 0;
                return (
                  <Link
                    key={row.groupId}
                    href={`/groups/${row.groupId}/settle`}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg min-h-[44px]
                               hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${badge.gradient}
                                    flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="flex-1 min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">
                      {row.name}
                    </span>
                    <span className={`text-sm font-semibold tabular-nums shrink-0
                      ${isOwed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {isOwed ? "+" : "−"}{formatCurrency(Math.abs(row.net), row.currency)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
