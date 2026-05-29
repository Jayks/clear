"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import type { DaySpend } from "@/lib/insights/trip-insights";
import { CATEGORY_HEX, getCategory } from "@/lib/categories";
import { formatCurrency, CHART_AXIS_TICK } from "@/lib/utils";

interface Props {
  data: DaySpend[];
  currency: string;
}

export function DailySpendBar({ data, currency }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) return null;

  const isDark = mounted && resolvedTheme === "dark";
  const xAxisFill = isDark ? "#64748B" : "#94A3B8";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  // Peak day index
  const peakIdx = data.reduce((maxI, d, i) => d.amount > data[maxI].amount ? i : maxI, 0);

  // Gather all unique categories, sorted by total descending
  // First category in the array = bottom of the stack (most prominent visually)
  const catTotals: Record<string, number> = {};
  for (const d of data) {
    for (const [cat, amt] of Object.entries(d.cats)) {
      catTotals[cat] = (catTotals[cat] ?? 0) + amt;
    }
  }
  const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  // Flatten cats into Recharts data objects
  const chartData = data.map((d) => ({ label: d.label, amount: d.amount, ...d.cats }));

  // Fallback: if no category breakdown (empty cats on all days), render a plain bar
  const usePlain = sortedCats.length === 0;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Daily spend</p>
        {/* Top-3 category colour legend */}
        {!usePlain && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {sortedCats.slice(0, 3).map((cat) => (
              <span key={cat} className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: CATEGORY_HEX[cat] ?? "#64748B" }}
                />
                {getCategory(cat).shortLabel ?? getCategory(cat).label}
              </span>
            ))}
            {sortedCats.length > 3 && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                +{sortedCats.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 18, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={CHART_AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={data.length > 8 ? Math.floor(data.length / 6) : 0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: xAxisFill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip
            cursor={{ fill: "rgba(6,182,212,0.06)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
              const items = payload.filter((p) => Number(p.value) > 0);
              return (
                <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg space-y-1 border border-white/60 dark:border-slate-700/60">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                  <p className="text-cyan-600 dark:text-cyan-400 font-semibold">{fmt(total)}</p>
                  {items.map((p) => (
                    <p key={String(p.dataKey)} style={{ color: CATEGORY_HEX[String(p.dataKey)] ?? "#64748B" }}>
                      {getCategory(String(p.dataKey)).label}: {fmt(Number(p.value))}
                    </p>
                  ))}
                </div>
              );
            }}
          />

          {usePlain ? (
            /* Fallback: plain single-colour bar when no category breakdown */
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={10} fill="#A5F3FC" />
          ) : (
            sortedCats.map((cat, i) => {
              const isTop = i === sortedCats.length - 1;
              return (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="a"
                  fill={CATEGORY_HEX[cat] ?? "#64748B"}
                  fillOpacity={0.9}
                  radius={isTop ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  barSize={10}
                >
                  {/* Peak-day amount label — rendered only on the topmost bar */}
                  {isTop && (
                    <LabelList
                      dataKey={cat}
                      position="top"
                      content={(props: {
                        x?: number | string;
                        y?: number | string;
                        width?: number | string;
                        index?: number;
                      }) => {
                        const { x = 0, y = 0, width = 0, index = 0 } = props;
                        if (index !== peakIdx || !chartData[index]?.amount) return null;
                        return (
                          <text
                            x={Number(x) + Number(width) / 2}
                            y={Number(y) - 4}
                            textAnchor="middle"
                            fill={isDark ? "#67E8F9" : "#0891B2"}
                            fontSize={9}
                            fontWeight={700}
                          >
                            {formatCurrency(Number(chartData[index].amount), currency)}
                          </text>
                        );
                      }}
                    />
                  )}
                </Bar>
              );
            })
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
