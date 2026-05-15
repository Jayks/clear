"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { TripSummary } from "@/lib/insights/all-trips-insights";
import { formatCurrency, CHART_AXIS_TICK } from "@/lib/utils";

interface Props {
  data: TripSummary[];
}

interface TooltipEntry {
  active?: boolean;
  payload?: Array<{ payload: TripSummary }>;
}

function CustomTooltip({ active, payload }: TooltipEntry) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{d.name}</p>
      <p className="text-cyan-600 font-medium">{formatCurrency(d.totalSpend, d.currency)}</p>
      <p className="text-slate-400">{d.expenseCount} expenses · {d.memberCount} members</p>
    </div>
  );
}

export function TripsSpendBar({ data }: Props) {
  if (data.length === 0) return null;
  const maxAmount = Math.max(...data.map((d) => d.totalSpend));

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Spend per trip</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={CHART_AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v}
          />
          <YAxis
            tick={CHART_AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(6,182,212,0.08)" }} />
          <Bar dataKey="totalSpend" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.totalSpend === maxAmount ? "#06B6D4" : "#A5F3FC"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
