import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type NestPaceStatus = "on_track" | "watch" | "over" | "building" | "complete";

export interface NestPaceData {
  daysElapsed: number;
  daysInMonth: number;
  thisMonthSpend: number;
  projectedMonthly: number;
  rollingAvg: number;
  paceStatus: NestPaceStatus;
  monthLabel: string; // e.g. "May 2026"
}

interface Props {
  data: NestPaceData;
  currency: string;
  groupId: string;
}

const STATUS_CONFIG: Record<NestPaceStatus, {
  label: string;
  color: string;
  bar: string;
  bg: string;
  icon: React.ElementType;
}> = {
  on_track: {
    label: "On pace",
    color: "text-emerald-600 dark:text-emerald-400",
    bar: "from-emerald-400 to-green-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    icon: TrendingDown,
  },
  watch: {
    label: "Watch it",
    color: "text-amber-600 dark:text-amber-400",
    bar: "from-amber-400 to-orange-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    icon: TrendingUp,
  },
  over: {
    label: "Trending over",
    color: "text-red-600 dark:text-red-400",
    bar: "from-red-400 to-rose-500",
    bg: "bg-red-50 dark:bg-red-900/30",
    icon: TrendingUp,
  },
  building: {
    label: "Building baseline",
    color: "text-slate-500 dark:text-slate-400",
    bar: "from-cyan-400 to-teal-500",
    bg: "bg-slate-50 dark:bg-slate-800",
    icon: Minus,
  },
  complete: {
    label: "Month complete",
    color: "text-slate-500 dark:text-slate-400",
    bar: "from-slate-300 to-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800",
    icon: Minus,
  },
};

export function computeNestPaceData(params: {
  thisMonthSpend: number;
  monthlyHistory: { month: string; amount: number }[]; // all months excl. current
  thisMonthKey: string;
  monthLabel: string;
}): NestPaceData | null {
  const { thisMonthSpend, monthlyHistory, thisMonthKey, monthLabel } = params;

  if (thisMonthSpend === 0) return null;

  const now = new Date();
  const [yr, mo] = thisMonthKey.split("-").map(Number);
  const isCurrentMonth = now.getFullYear() === yr && now.getMonth() + 1 === mo;

  const daysInMonth = new Date(yr, mo, 0).getDate();
  const daysElapsed = isCurrentMonth
    ? now.getDate()
    : daysInMonth; // past months: all days elapsed

  const projectedMonthly = daysElapsed > 0
    ? Math.round((thisMonthSpend / daysElapsed) * daysInMonth)
    : thisMonthSpend;

  // Rolling avg from last 3 completed months
  const recentHistory = monthlyHistory.slice(-3);
  const rollingAvg = recentHistory.length > 0
    ? Math.round(recentHistory.reduce((s, m) => s + m.amount, 0) / recentHistory.length)
    : 0;

  let paceStatus: NestPaceStatus;
  if (!isCurrentMonth) {
    paceStatus = "complete";
  } else if (rollingAvg === 0 || monthlyHistory.length < 2) {
    paceStatus = "building";
  } else {
    const ratio = projectedMonthly / rollingAvg;
    paceStatus = ratio <= 1.1 ? "on_track" : ratio <= 1.3 ? "watch" : "over";
  }

  return { daysElapsed, daysInMonth, thisMonthSpend, projectedMonthly, rollingAvg, paceStatus, monthLabel };
}

export function NestPaceCard({ data, currency, groupId }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const cfg = STATUS_CONFIG[data.paceStatus];
  const StatusIcon = cfg.icon;

  const barPct = data.rollingAvg > 0
    ? Math.min(100, Math.round((data.projectedMonthly / data.rollingAvg) * 100))
    : null;

  const isCurrentMonth = data.daysElapsed < data.daysInMonth;

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Monthly pace
        </h2>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* Daily burn + progress */}
      <div className="flex items-end gap-6 mb-4">
        <div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {fmt(data.projectedMonthly)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isCurrentMonth ? "projected this month" : "final this month"}
          </p>
        </div>
        <div className="pb-0.5">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Day {data.daysElapsed}
            {isCurrentMonth && (
              <span className="text-slate-400 dark:text-slate-500"> of {data.daysInMonth}</span>
            )}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{data.monthLabel}</p>
        </div>
      </div>

      {/* Spend so far + rolling avg */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Spent so far</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            {fmt(data.thisMonthSpend)}
          </span>
        </div>
        {data.rollingAvg > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">3-month avg</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              {fmt(data.rollingAvg)}
            </span>
          </div>
        )}
        {data.rollingAvg > 0 && data.projectedMonthly !== data.rollingAvg && (
          <div className={`flex items-center justify-between text-sm font-medium ${
            data.projectedMonthly > data.rollingAvg
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}>
            <span>
              {data.projectedMonthly > data.rollingAvg ? "Over avg by" : "Under avg by"}
            </span>
            <span className="tabular-nums">
              {fmt(Math.abs(data.projectedMonthly - data.rollingAvg))}
            </span>
          </div>
        )}

        {barPct !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
              <span>vs 3-month avg</span>
              <span className="tabular-nums">{barPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${cfg.bar} transition-all duration-700`}
                style={{ width: `${Math.min(barPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {(data.paceStatus === "watch" || data.paceStatus === "over") && (
          <div className="mt-3 pt-3 border-t border-white/40 dark:border-slate-700/40">
            <Link
              href={`/groups/${groupId}/expenses`}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              Review expenses →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
