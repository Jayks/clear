import { CountUp } from "@/components/shared/count-up";

interface KpiCardProps {
  label: string;
  value: string;          // static fallback / non-numeric values
  sub?: string;
  accent?: boolean;
  numericValue?: number;  // if set, animates from 0 → value
  currency?: string;      // paired with numericValue for currency formatting
}

export function KpiCard({ label, value, sub, accent, numericValue, currency }: KpiCardProps) {
  return (
    <div className="glass rounded-xl px-4 py-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>

      {numericValue !== undefined ? (
        <CountUp
          value={numericValue}
          currency={currency}
          className={`text-2xl font-semibold tabular ${accent ? "text-cyan-600 dark:text-cyan-400" : "text-slate-800 dark:text-slate-100"} [font-family:var(--font-fraunces)]`}
        />
      ) : (
        <p
          className={`text-2xl font-semibold tabular ${accent ? "text-cyan-600 dark:text-cyan-400" : "text-slate-800 dark:text-slate-100"}`}
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {value}
        </p>
      )}

      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
