import type { CrossTripInsight } from "@/lib/insights/cross-trip";

interface Props {
  insights: CrossTripInsight[];
}

export function CrossTripCard({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">How this trip compares</h2>
      <div className="space-y-3.5">
        {insights.map((insight, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-lg leading-none mt-0.5 shrink-0">{insight.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{insight.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{insight.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
