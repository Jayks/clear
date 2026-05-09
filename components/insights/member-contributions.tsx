"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MemberRow } from "@/lib/insights/trip-insights";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: MemberRow[];
  currency: string;
}

interface TooltipItem {
  name: string;
  value: number;
  fill: string;
}

interface MemberTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipItem[];
  currency: string;
}

function CustomTooltip({ active, payload, label, currency }: MemberTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg space-y-1 border border-white/60 dark:border-slate-700/60">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }} className="font-medium">
          {p.name}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

export function MemberContributions({ data, currency }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) return null;

  const isDark = mounted && resolvedTheme === "dark";
  const yAxisFill = isDark ? "#CBD5E1" : "#475569";   // slate-300 vs slate-600
  const xAxisFill = isDark ? "#64748B" : "#94A3B8";   // slate-500 vs slate-400
  const owedFill  = isDark ? "#475569" : "#E2E8F0";   // slate-600 vs slate-200

  const chartData = data.map((m) => ({ name: m.name, Paid: m.paid, Owed: m.owed }));

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Member contributions</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: xAxisFill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: yAxisFill }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "rgba(6,182,212,0.06)" }} />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600 dark:text-slate-300">{v}</span>} />
          <Bar dataKey="Paid" fill="#06B6D4" radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="Owed" fill={owedFill}  radius={[0, 4, 4, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
