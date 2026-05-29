"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import type { MemberRow } from "@/lib/insights/trip-insights";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Props {
  data: MemberRow[];
  currency: string;
  /** Member ID of the currently logged-in user — highlights their bars + shows net callout */
  currentMemberId?: string;
  /** Net position (paid − fair share) — positive = overpaid = owed money */
  currentUserNet?: number;
  /** Link to settle page so "Your net" callout is actionable */
  settleHref?: string;
  /** Equal share per person — draws a vertical dashed reference line so over/under-payers are immediately visible */
  fairShare?: number;
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

export function MemberContributions({ data, currency, currentMemberId, currentUserNet, settleHref, fairShare }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) return null;

  const isDark = mounted && resolvedTheme === "dark";
  const yAxisFill = isDark ? "#CBD5E1" : "#475569";   // slate-300 vs slate-600
  const xAxisFill = isDark ? "#64748B" : "#94A3B8";   // slate-500 vs slate-400
  const owedFill  = isDark ? "#475569" : "#E2E8F0";   // slate-600 vs slate-200

  const currentMemberName = currentMemberId
    ? (data.find((m) => m.memberId === currentMemberId)?.name ?? null)
    : null;

  const chartData = data.map((m) => ({
    name: m.name,
    Paid: m.paid,
    Owed: m.owed,
    isYou: m.memberId === currentMemberId,
  }));

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  // Dynamic Y-axis width: ~7px per char, clamped 56–90px
  const longestName = data.reduce((max, m) => {
    const name = m.memberId === currentMemberId ? "You" : m.name;
    return name.length > max ? name.length : max;
  }, 0);
  const yAxisWidth = Math.min(Math.max(longestName * 7, 56), 90);

  return (
    <div className="glass rounded-2xl p-5">
      {/* Header + custom legend in one row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Member contributions</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500 shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Paid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-600 shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Owed</span>
          </div>
        </div>
      </div>
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
            tick={(props) => {
              const { x, y, payload } = props;
              const isYou = payload.value === currentMemberName;
              // Replace with "You" for current user; truncate long names with ellipsis
              const raw: string = isYou ? "You" : payload.value;
              const MAX_CHARS = Math.floor(yAxisWidth / 7);
              const display = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS - 1) + "…" : raw;
              return (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={11}
                  fill={isYou ? (isDark ? "#67E8F9" : "#0891B2") : yAxisFill}
                  fontWeight={isYou ? 600 : 400}
                >
                  {display}
                </text>
              );
            }}
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "rgba(6,182,212,0.06)" }} />
          {/* Fair-share reference line — bars to the right overpaid, left = underpaid */}
          {fairShare && fairShare > 0 && (
            <ReferenceLine
              x={fairShare}
              stroke="#06B6D4"
              strokeDasharray="4 3"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              label={{
                value: "fair share",
                position: "insideTopRight",
                fontSize: 8,
                fill: "#06B6D4",
                opacity: 0.75,
              }}
            />
          )}
          <Bar dataKey="Paid" radius={[0, 4, 4, 0]} barSize={10}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isYou ? "#0891B2" : "#06B6D4"}
                fillOpacity={entry.isYou ? 1 : 0.75}
              />
            ))}
          </Bar>
          <Bar dataKey="Owed" radius={[0, 4, 4, 0]} barSize={10}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={owedFill}
                fillOpacity={entry.isYou ? 1 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Personal net callout */}
      {currentUserNet !== undefined && currentUserNet !== null && currentUserNet !== 0 && (
        <div className="mt-3 pt-3 border-t border-white/40 dark:border-slate-700/40 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your net position</p>
            <p className={`text-sm font-semibold mt-0.5 ${
              currentUserNet > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}>
              {currentUserNet > 0
                ? `+${fmt(currentUserNet)} above fair share`
                : `${fmt(Math.abs(currentUserNet))} below fair share`}
            </p>
          </div>
          {settleHref && (
            <Link
              href={settleHref}
              className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors shrink-0"
            >
              {currentUserNet > 0 ? "Collect →" : "Settle →"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
