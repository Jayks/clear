import { formatCurrency } from "@/lib/utils";
import { BarChart2 } from "lucide-react";

interface BudgetBarProps {
  spent: number;
  budget: number;
  currency: string;
}

export function BudgetBar({ spent, budget, currency }: BudgetBarProps) {
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  const remaining = budget - spent;

  return (
    <div className="glass rounded-xl px-4 py-4 hover:shadow-lg hover:shadow-amber-500/10 transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Budget</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
            {formatCurrency(spent, currency)}
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">
              of {formatCurrency(budget, currency)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <p className={`text-sm font-semibold tabular ${over ? "text-red-500" : "text-emerald-600"}`}
            style={{ fontFamily: "var(--font-fraunces)" }}>
            {over
              ? `${formatCurrency(Math.abs(remaining), currency)} over`
              : `${formatCurrency(remaining, currency)} left`}
          </p>
          {/* Always-visible "Insights →" affordance — signals the bar is tappable */}
          <div className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400 font-medium">
            <BarChart2 className="w-3 h-3" />
            <span>Insights →</span>
          </div>
        </div>
      </div>

      {/* Track */}
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            over
              ? "bg-red-400"
              : pct > 80
              ? "bg-amber-400"
              : "bg-gradient-to-r from-cyan-500 to-teal-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">{Math.round(pct)}% used</p>
    </div>
  );
}
