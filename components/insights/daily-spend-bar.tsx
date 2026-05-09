"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { DaySpend } from "@/lib/insights/trip-insights";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: DaySpend[];
  currency: string;
}

interface TooltipEntry {
  active?: boolean;
  label?: string;
  payload?: Array<{ value: number }>;
  currency: string;
}

function CustomTooltip({ active, payload, label, currency }: TooltipEntry) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg border border-white/60 dark:border-slate-700/60">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      <p className="text-cyan-600 dark:text-cyan-400 font-medium">{formatCurrency(payload[0].value, currency)}</p>
    </div>
  );
}

export function DailySpendBar({ data, currency }: Props) {
  if (data.length === 0) return null;

  const maxAmount = Math.max(...data.map((d) => d.amount));

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Daily spend</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            interval={data.length > 8 ? Math.floor(data.length / 6) : 0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "rgba(6,182,212,0.08)" }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.amount === maxAmount ? "#06B6D4" : "#A5F3FC"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
