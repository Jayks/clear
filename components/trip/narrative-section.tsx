"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { generateTripNarrative, type DayEntry } from "@/app/actions/narrative";

interface Props {
  tripName: string;
  description: string | null;
  itinerary: string | null;
  startDate: string | null;
  endDate: string | null;
  tripDays: number;
  memberCount: number;
  totalSpend: number;
  currency: string;
  categoryBreakdown: { category: string; total: number; pct: number }[];
  dailyTimeline: DayEntry[];
}

export function NarrativeSection(props: Props) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const result = await generateTripNarrative(props);
    setLoading(false);
    if (result.ok) {
      setNarrative(result.narrative);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-base font-semibold text-slate-700 dark:text-slate-200"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Trip story
        </h2>
        {narrative && !loading && (
          <button
            onClick={generate}
            className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-cyan-500 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </div>

      {!narrative && !loading && !error && (
        <div className="flex flex-col items-center py-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Let AI write a travel story from your trip data.
          </p>
          <button
            onClick={generate}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-md shadow-cyan-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate trip story
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-6 gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
          <p className="text-sm">Writing your story…</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-4">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            onClick={generate}
            className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {narrative && !loading && (
        <div className="space-y-3">
          {narrative.split("\n\n").map((para, i) => (
            <p
              key={i}
              className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic"
            >
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
