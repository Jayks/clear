"use client";

/**
 * PaymentMethodCard — shows how the user has settled payments across all contexts.
 *
 * Displayed in the PersonalContent "You" tab of global Insights (Plus users).
 * Only renders when there are > 0 confirmed settlements with a payment_method recorded.
 *
 * Visual: horizontal segmented bar + labelled rows with animated fill bars,
 * matching the GroupShareBars pattern already used in this section.
 */

import { motion } from "framer-motion";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from "@/lib/payment/types";
import type { PaymentMethod } from "@/lib/payment/types";

interface PaymentMethodStat {
  method:  string;
  total:   number;
  count:   number;
}

interface Props {
  stats:    PaymentMethodStat[];
  currency: string;
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style:              "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function PaymentMethodCard({ stats, currency }: Props) {
  if (stats.length === 0) return null;

  const grandTotal = stats.reduce((s, r) => s + r.total, 0);
  if (grandTotal < 1) return null;

  // Colour per method — consistent with PAYMENT_METHOD_ICONS / app palette
  const METHOD_COLORS: Record<string, string> = {
    upi:           "from-cyan-500 to-teal-500",
    cash:          "from-emerald-500 to-green-500",
    bank_transfer: "from-blue-500 to-indigo-500",
    other:         "from-slate-400 to-slate-500",
  };

  const METHOD_BAR_BG: Record<string, string> = {
    upi:           "bg-cyan-400 dark:bg-cyan-500",
    cash:          "bg-emerald-400 dark:bg-emerald-500",
    bank_transfer: "bg-blue-400 dark:bg-blue-500",
    other:         "bg-slate-400 dark:bg-slate-500",
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          How you settle up
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {stats.reduce((s, r) => s + r.count, 0)} payments · {fmt(grandTotal, currency)}
        </p>
      </div>

      {/* Segmented bar */}
      <div className="flex rounded-full overflow-hidden h-2.5 gap-px">
        {stats.map((r, i) => {
          const pct = (r.total / grandTotal) * 100;
          return (
            <motion.div
              key={r.method}
              className={`h-full ${METHOD_BAR_BG[r.method] ?? "bg-slate-400"}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
            />
          );
        })}
      </div>

      {/* Row list */}
      <div className="space-y-2.5">
        {stats.map((r, i) => {
          const pct     = Math.round((r.total / grandTotal) * 100);
          const label   = PAYMENT_METHOD_LABELS[r.method as PaymentMethod] ?? r.method;
          const icon    = PAYMENT_METHOD_ICONS[r.method as PaymentMethod] ?? "💳";
          const barBg   = METHOD_BAR_BG[r.method] ?? "bg-slate-400";

          return (
            <div key={r.method} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {r.count} payment{r.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {fmt(r.total, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 w-7 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
              {/* Animated fill bar */}
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${barBg}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.55, delay: 0.1 + i * 0.07, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
