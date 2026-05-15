"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency, CHART_AXIS_TICK } from "@/lib/utils";

export interface MonthSpend {
  label: string;   // "May '26"
  month: string;   // "2026-05"
  amount: number;
  recurring: number;
  adhoc: number;
}

interface Props {
  data: MonthSpend[];
  currency: string;
}

interface TooltipEntry {
  active?: boolean;
  label?: string;
  payload?: Array<{ value: number; name: string }>;
  currency: string;
}

function CustomTooltip({ active, payload, label, currency }: TooltipEntry) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg border border-white/60 dark:border-slate-700/60 space-y-1">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      <p className="text-cyan-600 dark:text-cyan-400 font-medium">Total {formatCurrency(total, currency)}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-slate-500 dark:text-slate-400">
          {p.name === "recurring" ? "Recurring" : "One-off"}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

export function MonthlySpendBar({ data, currency }: Props) {
  if (data.length === 0) return null;

  const maxAmount = Math.max(...data.map((d) => d.amount));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly spend</p>
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" /> Recurring
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-300 inline-block" /> One-off
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={CHART_AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={CHART_AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "rgba(6,182,212,0.08)" }} />
          <Bar dataKey="recurring" stackId="a" fill="#A5F3FC" radius={[0, 0, 0, 0]} name="recurring" />
          <Bar dataKey="adhoc" stackId="a" radius={[4, 4, 0, 0]} name="adhoc">
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.amount === maxAmount ? "#06B6D4" : "#5EEAD4"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
