"use client";

/**
 * SectionPillNav — sticky pill row that tracks which section is in the viewport
 * and highlights the matching pill. Clicking any pill smooth-scrolls to that
 * section (scroll-behavior: smooth is set globally on <html>).
 *
 * Lives just below the sticky AppNav (top-14 = 56px).
 * Sections need scroll-mt-28 to clear both navbars on scroll.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type SectionColor = "cyan" | "emerald" | "violet" | "amber" | "slate";

export interface NavSection {
  id:    string;
  label: string;
  count: number;
  color: SectionColor;
}

// ── Per-colour Tailwind class bundles ─────────────────────────────────────────

const COLORS: Record<SectionColor, {
  active:      string;
  activeBadge: string;
  hover:       string;
  badge:       string;   // inactive badge
}> = {
  cyan: {
    active:      "border-cyan-300 dark:border-cyan-700/60 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
    activeBadge: "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-300",
    hover:       "hover:border-cyan-300 dark:hover:border-cyan-700/60 hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-cyan-50/60 dark:hover:bg-cyan-950/20",
    badge:       "bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400",
  },
  emerald: {
    active:      "border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    activeBadge: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300",
    hover:       "hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20",
    badge:       "bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400",
  },
  violet: {
    active:      "border-violet-300 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
    activeBadge: "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300",
    hover:       "hover:border-violet-300 dark:hover:border-violet-700/60 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50/60 dark:hover:bg-violet-950/20",
    badge:       "bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400",
  },
  amber: {
    active:      "border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    activeBadge: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300",
    hover:       "hover:border-amber-300 dark:hover:border-amber-700/60 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/20",
    badge:       "bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400",
  },
  slate: {
    active:      "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    activeBadge: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
    hover:       "hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200",
    badge:       "bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

/** Optional dashed "create" pills shown alongside section pills */
export interface CreatePill {
  label: string;
  href:  string;
  color: SectionColor;
}

interface Props {
  sections:     NavSection[];
  createPills?: CreatePill[];
}

export function SectionPillNav({ sections, createPills = [] }: Props) {
  // Default to first section so something is highlighted on initial render
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;

    // Scroll-position approach: on each scroll tick find the last section whose
    // top has crossed the trigger line. Reliable regardless of section height —
    // works for short Circles (1 card) just as well as tall Nests/Trips.
    //
    // TRIGGER_OFFSET: 45% of viewport height. This is well above scroll-mt-28 (112px)
    // so any section that has been scrolled into view will reliably register,
    // even on small screens. Using a viewport-relative value adapts to device size.
    function getOffset() { return window.innerHeight * 0.45; }

    function updateActive() {
      const offset = getOffset();
      // Measure each section's distance from the viewport top
      const positions = sections.map((s) => ({
        id:  s.id,
        top: document.getElementById(s.id)?.getBoundingClientRect().top ?? Infinity,
      }));

      // The active section is the LAST one in page order whose top has crossed
      // the trigger line. Reversing lets .find() return the furthest-down match.
      const hit = [...positions].reverse().find((p) => p.top <= offset);
      setActiveId(hit?.id ?? sections[0]?.id ?? "");
    }

    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive(); // set correct pill on mount / after navigation

    return () => window.removeEventListener("scroll", updateActive);
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    // Sticks just below the AppNav (h-14 = 56px → top-14)
    // -mx-6 px-6 breaks out of main padding to be full-width
    <div className="sticky top-14 z-40 -mx-6 px-6 pt-2 pb-2 backdrop-blur-sm mb-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
        {/* Dashed create pills — for missing section types */}
        {createPills.map(({ label, href, color }) => {
          const c = COLORS[color];
          return (
            <a
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1 px-4 py-2 rounded-full shrink-0",
                "text-sm font-medium whitespace-nowrap transition-all",
                "border border-dashed",
                "border-slate-300 dark:border-slate-600",
                "text-slate-400 dark:text-slate-500",
                c.hover,
              )}
            >
              <span className="text-xs">+</span>
              {label}
            </a>
          );
        })}

        {sections.map(({ id, label, count, color }) => {
          const isActive = activeId === id;
          const c        = COLORS[color];

          return (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setActiveId(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full shrink-0",
                "text-sm font-medium whitespace-nowrap transition-all border",
                isActive
                  ? c.active
                  : cn(
                      "border-slate-200/80 dark:border-slate-700/60",
                      "bg-white/50 dark:bg-slate-800/40",
                      "text-slate-600 dark:text-slate-300",
                      c.hover,
                    ),
              )}
            >
              {label}
              <span
                className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded-full leading-none",
                  isActive ? c.activeBadge : c.badge,
                )}
              >
                {count}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
