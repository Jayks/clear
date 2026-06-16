"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getContextTheme } from "@/lib/theme/context-theme";
import { getGroupTabs, sectionFromPath } from "@/lib/nav/group-tabs";

/**
 * Contextual in-group bottom nav (mobile only). While you're inside a group the
 * global MobileNav (Home/Streams/Insights) hides and THIS takes its place — so
 * lateral movement between the group's pages is one thumb-tap instead of a hub
 * round-trip. Colour = the group's context (getContextTheme); the active tab
 * gets a sliding pill (same pattern as MobileNav). Back ("‹ Home" in the top
 * GroupMobileNav) is the exit to the global app.
 *
 * Tabs are circle-aware: circles have no Settle/Insights (mirrors the
 * GroupActionHub "Jump to" reduction), so they show Overview · Expenses · Members.
 */
interface Props {
  groupId: string;
  groupType: string;            // 'trip' | 'nest' | 'circle'
  circleMode?: string | null;   // 'recurring' | 'one_time' (circles only)
}

export function GroupBottomNav({ groupId, groupType, circleMode }: Props) {
  const pathname = usePathname();
  const theme = getContextTheme(groupType, circleMode);
  const tabs = getGroupTabs(groupId, groupType);

  // Which page are we on? /groups/[id]/<section>/...  → section ("" = overview)
  const actual = sectionFromPath(pathname);

  // Optimistic active tab: usePathname() only updates AFTER the route commits, so
  // relying on it makes the pill snap after a beat of navigation latency (jumpy).
  // Setting the tapped section immediately slides the pill on tap; once the real
  // path catches up we clear the override (they then agree, no visual change).
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { setPending(null); }, [actual]);
  const current = pending ?? actual;

  const nav = (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-md
                 bg-gradient-to-t from-white/85 to-white/40
                 dark:from-slate-950/85 dark:to-slate-950/40"
      aria-label="Group sections"
    >
      <div className="flex items-stretch px-1.5 h-nav-safe">
        {tabs.map(({ section, label, icon: Icon, href }) => {
          const active = current === section;
          return (
            <Link
              key={section || "overview"}
              href={href}
              onClick={() => setPending(section)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex-1 min-w-0 flex flex-col items-center gap-1 py-2 rounded-xl min-h-[44px] justify-center transition-colors",
                active ? theme.accentText : "text-slate-500 dark:text-slate-400",
              )}
            >
              {/* Sliding pill — Framer Motion animates between tabs via layoutId.
                  Rendered only inside the active link so it carries that group's
                  context colour for the whole slide (no mid-animation flash). */}
              {active && (
                <motion.div
                  layoutId="group-nav-pill"
                  className={cn("absolute inset-x-1 top-1 bottom-1 rounded-xl", theme.navPill)}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className="relative z-10 w-5 h-5 shrink-0" />
              <span className="relative z-10 text-[11px] font-medium truncate max-w-full">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  // Portal to <body> so the bar escapes the PageTransition wrapper, which is
  // keyed on pathname and replays an opacity/translate animation on every
  // navigation — that animation was flickering the whole bar. Outside that
  // subtree it stays visually stable across route changes. (SSR renders null;
  // the bar appears on the client — acceptable for a fixed mobile-only nav.)
  return typeof document !== "undefined" ? createPortal(nav, document.body) : null;
}
