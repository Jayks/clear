"use client";

import { motion } from "framer-motion";
import type { Highlight } from "@/lib/insights/trip-insights";

interface Props {
  highlights: Highlight[];
}

export function HighlightsStrip({ highlights }: Props) {
  if (highlights.length === 0) return null;

  // Dynamic column count — grid-cols-3 with 1 card looks broken (lone card at 33%)
  const gridCols =
    highlights.length === 1 ? "grid-cols-1 sm:grid-cols-2 max-w-sm" :
    highlights.length === 2 ? "grid-cols-2" :
    "grid-cols-3";

  return (
    <div className={`grid ${gridCols} gap-3 mb-6`}>
      {highlights.map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 14, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: i * 0.09, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative glass rounded-2xl px-3 py-3 sm:px-4 sm:py-4 overflow-hidden"
        >
          {/* Vivid colour orb */}
          <div
            className={`pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.18] dark:opacity-[0.22] blur-2xl bg-gradient-to-br ${h.accentColor}`}
          />
          {/* Bottom-left accent dot */}
          <div
            className={`pointer-events-none absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-[0.12] dark:opacity-[0.16] blur-xl bg-gradient-to-br ${h.accentColor}`}
          />

          <div className="text-2xl sm:text-3xl mb-2 leading-none">{h.emoji}</div>
          <p
            className="text-[11px] sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug mb-0.5 sm:mb-1"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {h.title}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
            {h.sub}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
