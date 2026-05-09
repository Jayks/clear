"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Sparkles, GitCompare } from "lucide-react";
import { analyzeTripAdherence, type AdherenceResult } from "@/app/actions/trip-adherence";

interface Props {
  itinerary: string;
  expenses: { description: string; expenseDate: string }[];
}

function coverageColor(pct: number) {
  if (pct >= 80) return { bar: "bg-teal-500", text: "text-teal-600 dark:text-teal-400", badge: "bg-teal-50 dark:bg-teal-900/30" };
  if (pct >= 50) return { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-50 dark:bg-amber-900/30" };
  return { bar: "bg-red-400", text: "text-red-600 dark:text-red-400", badge: "bg-red-50 dark:bg-red-900/30" };
}

export function AdherenceCard({ itinerary, expenses }: Props) {
  const [result, setResult] = useState<AdherenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyse() {
    setLoading(true);
    setError(null);
    const res = await analyzeTripAdherence(itinerary, expenses);
    setLoading(false);
    if (res.ok) setResult(res.result);
    else setError(res.error);
  }

  const colors = result ? coverageColor(result.coveragePercent) : null;

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-cyan-500" />
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200" style={{ fontFamily: "var(--font-fraunces)" }}>
            Plan vs Reality
          </h2>
        </div>
        {result && !loading && (
          <button
            onClick={analyse}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-cyan-500 transition-colors"
          >
            Re-analyse
          </button>
        )}
      </div>

      {/* Initial state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center py-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Compare your planned itinerary against what actually happened.
          </p>
          <button
            onClick={analyse}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-md shadow-cyan-500/20 transition-all"
          >
            <GitCompare className="w-4 h-4" />
            Analyse
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-6 gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
          <p className="text-sm">Comparing plan to reality…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-4">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={analyse} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {result && colors && !loading && (
        <div className="space-y-5">
          {/* Coverage score */}
          <div className={`${colors.badge} rounded-xl p-4 flex items-center gap-4`}>
            <div className={`text-4xl font-bold tabular-nums ${colors.text}`} style={{ fontFamily: "var(--font-fraunces)" }}>
              {result.coveragePercent}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                {result.coveredCount} of {result.plannedCount} planned activities completed
              </p>
              <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${colors.bar}`}
                  style={{ width: `${result.coveragePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Three columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Covered */}
            {result.coveredItems.length > 0 && (
              <div className="bg-teal-50/60 dark:bg-teal-900/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Covered
                </p>
                <ul className="space-y-1">
                  {result.coveredItems.map((item, i) => (
                    <li key={i} className="text-xs text-teal-800 dark:text-teal-300 flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missed */}
            {result.missedItems.length > 0 && (
              <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Missed
                </p>
                <ul className="space-y-1">
                  {result.missedItems.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">✗</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Surprises */}
            {result.surprises.length > 0 && (
              <div className="bg-cyan-50/60 dark:bg-cyan-900/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Surprises
                </p>
                <ul className="space-y-1">
                  {result.surprises.map((item, i) => (
                    <li key={i} className="text-xs text-cyan-800 dark:text-cyan-300 flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">★</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* AI summary */}
          {result.summary && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic border-t border-slate-100 dark:border-slate-700 pt-3">
              {result.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
