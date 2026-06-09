"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import { motion, useInView, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
import { getCategory, CATEGORY_HEX } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface TimelineEntry {
  description: string;
  category: string;
  amount: number;
  payerName: string;
}

interface DayGroup {
  date: string;
  entries: TimelineEntry[];
  dayTotal: number;
}

interface Props {
  days: DayGroup[];
  startDate: string | null;
  endDate: string | null;
  currency: string;
}

// Consistent colors per-payer index across the page
const PAYER_COLORS = [
  "#06B6D4", // cyan-500
  "#8B5CF6", // violet-500
  "#F97316", // orange-500
  "#10B981", // emerald-500
  "#EC4899", // pink-500
  "#F59E0B", // amber-500
  "#3B82F6", // blue-500
  "#EF4444", // red-500
];

function tlDayLabel(date: string, startDate: string | null, totalDays: number | null): string {
  if (!startDate || date === "unknown") return "";
  try {
    const diff = differenceInDays(parseISO(date), parseISO(startDate));
    if (diff < 0) return "Pre-trip";
    const dayNum = diff + 1;
    if (totalDays && totalDays > 1) return `Day ${dayNum}/${totalDays}`;
    return `Day ${dayNum}`;
  } catch {
    return "";
  }
}

function tlFormatDay(date: string): string {
  if (date === "unknown") return "Unknown date";
  try {
    return format(parseISO(date), "EEE, MMM d");
  } catch {
    return date;
  }
}

// ─── DayCard: one scroll-animated day ────────────────────────────────────────

function DayCard({
  day,
  index,
  maxDayTotal,
  startDate,
  endDate,
  totalDays,
  currency,
}: {
  day: DayGroup;
  index: number;
  maxDayTotal: number;
  startDate: string | null;
  endDate: string | null;
  totalDays: number | null;
  currency: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });

  // ── Count-up: animates 0 → dayTotal when card enters viewport ─────
  const countMotion = useMotionValue(0);
  const [countText, setCountText] = useState(() => formatCurrency(0, currency));
  useMotionValueEvent(countMotion, "change", (v) => {
    setCountText(formatCurrency(Math.round(v), currency));
  });
  useEffect(() => {
    if (!isInView) return;
    const controls = animate(countMotion, day.dayTotal, { duration: 0.5, ease: "easeOut" });
    return () => controls.stop();
  }, [isInView, day.dayTotal, countMotion]);

  // ── Stacked category segments (largest share first) ───────────────
  const segments = useMemo(() => {
    if (day.dayTotal === 0) return [];
    const map = new Map<string, number>();
    for (const e of day.entries) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({
        category: cat,
        color: CATEGORY_HEX[cat] ?? "#06B6D4",
        pct: (total / day.dayTotal) * 100,
      }));
  }, [day.entries, day.dayTotal]);

  // ── Unique payers, √-scaled by share of day spend ─────────────────
  const payers = useMemo(() => {
    const payerAmounts = new Map<string, number>();
    for (const e of day.entries) {
      payerAmounts.set(e.payerName, (payerAmounts.get(e.payerName) ?? 0) + e.amount);
    }
    return [...payerAmounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount], idx) => {
        const pct = day.dayTotal > 0 ? amount / day.dayTotal : 1;
        return {
          name,
          amount,
          initials: name.slice(0, 1).toUpperCase(),
          color: PAYER_COLORS[idx % PAYER_COLORS.length],
          // √ scaling: area ∝ spend (perceptually accurate); range 20 → 32 px
          size: Math.round(20 + Math.sqrt(pct) * 12),
          fontSize: Math.round(9 + Math.sqrt(pct) * 4),
        };
      });
  }, [day.entries, day.dayTotal]);

  // ── Day metadata ──────────────────────────────────────────────────
  const label = tlDayLabel(day.date, startDate, totalDays);
  const isPreTrip = label === "Pre-trip";
  const isPostTrip =
    !!endDate &&
    day.date !== "unknown" &&
    differenceInDays(parseISO(day.date), parseISO(endDate)) > 0;
  const isOff = isPreTrip || isPostTrip;
  const badge = isPreTrip ? "Pre-trip" : isPostTrip ? "Post-trip" : label;

  const spendPct = Math.round((day.dayTotal / maxDayTotal) * 100);
  // Only mark busiest when there's more than one day (otherwise every day "wins")
  const isBusiest = spendPct === 100 && !isOff;

  const dominantColor = segments.length > 0 ? segments[0].color : null;

  const lineColor = isOff
    ? "to-slate-200/60 dark:to-slate-700/40"
    : isBusiest
    ? "to-amber-300/70 dark:to-amber-700/40"
    : "to-cyan-200/70 dark:to-cyan-800/40";

  const badgeClass = isOff
    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
    : isBusiest
    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
    : "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Animated connector thread — draws downward as card enters view */}
      {index > 0 && (
        <div className="flex justify-center py-0.5 mb-1 overflow-hidden">
          <motion.div
            className="w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent dark:via-slate-700/50"
            initial={{ height: 0 }}
            animate={isInView ? { height: 16 } : { height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
      )}

      {/* Day card — subtle tint from dominant category colour */}
      <div
        className="rounded-2xl px-3 pt-3 pb-2"
        style={{ backgroundColor: dominantColor ? `${dominantColor}12` : undefined }}
      >
        {/* ── Day label: centered node + gradient rules ─────────────── */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${lineColor}`} />
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              isOff       ? "bg-slate-400 dark:bg-slate-500"
              : isBusiest ? "bg-amber-400 dark:bg-amber-500"
              :             "bg-cyan-400 dark:bg-cyan-500"
            }`} />
            {badge && (
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}>
                {badge}
              </span>
            )}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tlFormatDay(day.date)}
            </span>
            <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
            <span
              className={`text-xs font-semibold tabular-nums ${
                isBusiest ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"
              }`}
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {countText}
            </span>
          </div>
          <div className={`flex-1 h-px bg-gradient-to-l from-transparent ${lineColor}`} />
        </div>

        {/* ── Payer chips + item count ──────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 mb-2.5">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {day.entries.length}{day.entries.length === 1 ? " item" : " items"}
          </span>
          {payers.length > 0 && (
            <>
              <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
              {payers.map(({ name, amount, initials, color, size, fontSize }) => (
                <div
                  key={name}
                  title={`${name}: ${formatCurrency(amount, currency)}`}
                  className="rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-1 ring-white/20 dark:ring-black/20 transition-transform duration-150 hover:scale-110 cursor-default"
                  style={{ width: size, height: size, backgroundColor: color, fontSize }}
                >
                  {initials}
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Stacked category bar — grows from centre, visual-only ─── */}
        <div className="relative h-5 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-hidden">
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex overflow-hidden rounded-xl"
            style={{
              width: isInView ? `${spendPct}%` : "0%",
              transition: "width 850ms cubic-bezier(0.34, 1.56, 0.64, 1) 80ms",
            }}
          >
            {isOff ? (
              <div className="flex-1 opacity-50" style={{ backgroundColor: "#94A3B8" }} />
            ) : (
              segments.map(({ category, color, pct }) => {
                const catMeta = getCategory(category);
                const Icon = catMeta.icon;
                return (
                  <div
                    key={category}
                    title={catMeta.label}
                    className="h-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  >
                    {pct >= 20 && <Icon className="w-2.5 h-2.5 text-white/90 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Intensity caption — busiest / light day ───────────────────── */}
        <div className="flex justify-center h-5 mt-0.5 mb-2">
          {isBusiest && (
            <span className="text-[10px] font-medium text-amber-500 dark:text-amber-400 tracking-wide">
              🔥 busiest day
            </span>
          )}
          {!isBusiest && spendPct <= 25 && !isOff && (
            <span className="text-[10px] font-medium text-teal-500 dark:text-teal-400 tracking-wide">
              light day
            </span>
          )}
        </div>

        {/* ── Expense rows — always visible, stagger in on scroll ────── */}
        <div className="space-y-px">
          {day.entries.map((entry, j) => {
            const cat = getCategory(entry.category);
            const Icon = cat.icon;
            return (
              <motion.div
                key={j}
                initial={{ opacity: 0, y: 6 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.3,
                  delay: 0.12 + Math.min(j, 6) * 0.05,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Category icon */}
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center shrink-0`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                {/* Description + payer */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                    {entry.description}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {entry.payerName}
                  </p>
                </div>
                {/* Amount */}
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                  {formatCurrency(entry.amount, currency)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── TripTimeline: orchestrates the day list ─────────────────────────────────

export function TripTimeline({ days, startDate, endDate, currency }: Props) {
  if (days.length === 0) return null;

  const maxDayTotal = Math.max(...days.map((d) => d.dayTotal), 1);
  const totalDays =
    startDate && endDate
      ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1
      : null;

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
          <CalendarDays className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Day by day
        </span>
        <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r from-cyan-200/70 to-transparent dark:from-cyan-800/40 dark:to-transparent" />
      </div>

      {/* Day cards */}
      <div>
        {days.map((day, i) => (
          <DayCard
            key={day.date}
            day={day}
            index={i}
            maxDayTotal={maxDayTotal}
            startDate={startDate}
            endDate={endDate}
            totalDays={totalDays}
            currency={currency}
          />
        ))}
      </div>
    </div>
  );
}
