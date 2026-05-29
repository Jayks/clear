"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { parseISO, format, differenceInDays } from "date-fns";
import type { TripSummary } from "@/lib/insights/all-trips-insights";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: TripSummary[];   // expected in chronological order (oldest first)
  currency: string;
  /** Override the default "Spend per trip" title — use when rendering one chart per currency */
  title?: string;
}

interface TooltipEntry {
  active?: boolean;
  payload?: Array<{ payload: TripSummary }>;
}

function CustomTooltip({ active, payload }: TooltipEntry) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const dateStr = d.startDate
    ? (() => {
        const s = format(parseISO(d.startDate), "d MMM yyyy");
        const e = d.endDate ? format(parseISO(d.endDate), "d MMM yyyy") : null;
        return e && e !== s ? `${s} – ${e}` : s;
      })()
    : null;
  const days = d.startDate && d.endDate
    ? differenceInDays(parseISO(d.endDate), parseISO(d.startDate)) + 1
    : null;

  return (
    <div className="glass rounded-xl px-3 py-2.5 text-xs shadow-lg space-y-1 border border-white/60 dark:border-slate-700/60 max-w-[200px]">
      <p className="font-semibold text-slate-700 dark:text-slate-200 leading-snug">{d.name}</p>
      {dateStr && <p className="text-slate-400 dark:text-slate-500">{dateStr}{days ? ` · ${days}d` : ""}</p>}
      <p className="text-cyan-600 dark:text-cyan-400 font-semibold">{formatCurrency(d.totalSpend, d.currency)}</p>
      <p className="text-slate-400 dark:text-slate-500">{d.expenseCount} expenses · {d.memberCount} members</p>
    </div>
  );
}

export function TripsSpendBar({ data, currency, title = "Spend per trip" }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) return null;

  const isDark = mounted && resolvedTheme === "dark";
  const yAxisFill = isDark ? "#CBD5E1" : "#475569";
  const yAxisSecondary = isDark ? "#475569" : "#94A3B8";
  const xAxisFill = isDark ? "#64748B" : "#94A3B8";

  const maxSpend = Math.max(...data.map((d) => d.totalSpend));

  // Dynamic Y-axis width based on longest trip name
  const longestName = data.reduce((max, t) => Math.max(max, t.name.length), 0);
  const yAxisWidth = Math.min(Math.max(longestName * 6.5, 80), 130);
  const MAX_NAME_CHARS = Math.floor(yAxisWidth / 6.5);

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 60)}>
        <ComposedChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
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
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
            tick={(props) => {
              const { x, y, payload } = props;
              const trip = data.find((t) => t.name === payload.value);
              const raw: string = payload.value ?? "";
              const display = raw.length > MAX_NAME_CHARS
                ? raw.slice(0, MAX_NAME_CHARS - 1) + "…"
                : raw;
              const dateStr = trip?.startDate
                ? (() => {
                    const d = format(parseISO(trip.startDate), "MMM ''yy");
                    if (trip.endDate) {
                      const days = differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1;
                      return `${d} · ${days}d`;
                    }
                    return d;
                  })()
                : null;

              return (
                // y={y} is required — without it all labels render at y=0 (top of chart)
                <text x={x} y={y} textAnchor="end" fontSize={11}>
                  <tspan dy={dateStr ? "-6" : "4"} fill={yAxisFill} fontWeight={500}>
                    {display}
                  </tspan>
                  {dateStr && (
                    <tspan x={x} dy="13" fill={yAxisSecondary} fontSize={9}>
                      {dateStr}
                    </tspan>
                  )}
                </text>
              );
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(6,182,212,0.06)" }} />
          <Bar dataKey="totalSpend" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.totalSpend === maxSpend ? "#06B6D4" : "#A5F3FC"}
                fillOpacity={entry.totalSpend === maxSpend ? 1 : isDark ? 0.5 : 0.8}
              />
            ))}
          </Bar>
          {/* Trend line — connects bar tips chronologically (top = oldest, bottom = newest).
              Only shown for 3+ trips where a trend is meaningful. */}
          {data.length >= 3 && (
            <Line
              dataKey="totalSpend"
              type="linear"
              dot={{ r: 3, fill: "#06B6D4", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#06B6D4" }}
              stroke="#06B6D4"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.65}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
