"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { CategorySlice } from "@/lib/insights/trip-insights";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: CategorySlice[];
  currency: string;
}

interface TooltipEntry {
  active?: boolean;
  payload?: Array<{ payload: CategorySlice }>;
}

function CustomTooltip({ active, payload }: TooltipEntry) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg border border-white/60 dark:border-slate-700/60">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{d.label}</p>
      <p className="text-slate-500 dark:text-slate-400">{formatCurrency(d.amount, "INR")} · {d.percentage}%</p>
    </div>
  );
}

export function CategoryDonut({ data, currency }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Spend by category</p>

      {/* Chart — no built-in legend */}
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={2}
            dataKey="amount"
            nameKey="label"
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={entry.hex} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend — always fully visible */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((entry) => (
          <div key={entry.category} className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.hex }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{entry.label}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto shrink-0">{entry.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
