"use client";

import { motion } from "framer-motion";
import { Home, MapPin } from "lucide-react";
import type { AllTripsInsights } from "@/lib/insights/all-trips-insights";
import type { AllNestsInsights } from "@/lib/insights/all-nests-insights";

interface Props {
  tripsData: AllTripsInsights;
  nestsData: AllNestsInsights;
  currency: string;
}

export function CrossTabCard({ tripsData, nestsData, currency }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const homeDailyRate = nestsData.monthlyAverage > 0
    ? Math.round(nestsData.monthlyAverage / 30)
    : 0;
  const travelDailyRate = tripsData.dailyPace;

  // Only show multiplier when travel is meaningfully more expensive
  const multiplier =
    homeDailyRate > 0 && travelDailyRate > 0
      ? Math.round((travelDailyRate / homeDailyRate) * 10) / 10
      : null;

  // Combined total — only when same currency (nests are always INR currently)
  const sameCurrency = currency === "INR";
  const combinedTotal = sameCurrency
    ? tripsData.totalSpend + nestsData.totalSpend
    : null;

  // Need at least one meaningful rate to show the card
  if (homeDailyRate === 0 && travelDailyRate === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative glass rounded-2xl p-5 mb-6 overflow-hidden"
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-8 -left-8 w-36 h-36 rounded-full opacity-[0.12] dark:opacity-[0.15] blur-3xl bg-gradient-to-br from-teal-400 to-emerald-400" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 w-36 h-36 rounded-full opacity-[0.12] dark:opacity-[0.15] blur-3xl bg-gradient-to-br from-cyan-400 to-teal-500" />

      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
        Home vs Travel
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Home */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/25 shrink-0">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">At home</p>
            {homeDailyRate > 0 ? (
              <>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-tight"
                  style={{ fontFamily: "var(--font-fraunces)" }}>
                  {fmt(homeDailyRate)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">per day</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {fmt(nestsData.monthlyAverage)}/mo avg
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Not enough data</p>
            )}
          </div>
        </div>

        {/* Travel */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-500/25 shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Traveling</p>
            {travelDailyRate > 0 ? (
              <>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-tight"
                  style={{ fontFamily: "var(--font-fraunces)" }}>
                  {fmt(travelDailyRate)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">per day</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  across {tripsData.totalDays} days
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">No dated trips</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: multiplier + combined total */}
      <div className="border-t border-white/40 dark:border-slate-700/40 pt-3 flex items-center justify-between gap-3 flex-wrap">
        {multiplier !== null && multiplier > 1 && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">{multiplier}×</span>
            {" "}more expensive on the road than at home
          </p>
        )}
        {combinedTotal !== null && combinedTotal > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-auto">
            {fmt(combinedTotal)} all time
          </p>
        )}
      </div>
    </motion.div>
  );
}
