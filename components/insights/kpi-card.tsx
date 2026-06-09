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
  if (accent) {
    return (
      <div className="h-full rounded-xl px-4 py-4 bg-gradient-to-br from-amber-500 to-orange-400 shadow-md shadow-amber-500/25 overflow-hidden">
        <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-1">{label}</p>
        {numericValue !== undefined ? (
          <CountUp
            value={numericValue}
            currency={currency}
            maximumFractionDigits={0}
            className="text-xl sm:text-2xl font-semibold tabular text-white [font-family:var(--font-fraunces)]"
          />
        ) : (
          <p className="text-xl sm:text-2xl font-semibold tabular text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
            {value}
          </p>
        )}
        {sub && <p className="text-xs text-white/80 mt-0.5">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="h-full glass rounded-xl px-4 py-4 overflow-hidden">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      {numericValue !== undefined ? (
        <CountUp
          value={numericValue}
          currency={currency}
          maximumFractionDigits={0}
          className="text-xl sm:text-2xl font-semibold tabular text-slate-800 dark:text-slate-100 [font-family:var(--font-fraunces)]"
        />
      ) : (
        <p className="text-xl sm:text-2xl font-semibold tabular text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
          {value}
        </p>
      )}
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
