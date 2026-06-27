"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContextTheme } from "@/lib/theme/context-theme";
import { getGroupTabs, sectionFromPath } from "@/lib/nav/group-tabs";
import { GroupSwitcherDropdown } from "./group-switcher-dropdown";
import { GroupActionHub } from "@/components/trip/group-action-hub";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";

/**
 * Desktop in-group tab strip (md+ only). The desktop counterpart of the mobile
 * GroupBottomNav: lateral movement between the group's pages, plus the group
 * name + ▾ switcher. Rendered sticky below AppNav by the group layout.
 *
 * Active tab gets a context-coloured underline. Optimistic active (like the
 * bottom nav) so the indicator moves on click, not after the route commits.
 *
 * Carries the same ⋯ manage trigger GroupMobileNav has on every in-group page
 * — previously the only desktop entry point to Edit/Archive/Share was
 * GroupHeroHub on the Overview page specifically, so a desktop user on
 * Expenses/Settle/Members/Insights had no way to reach it without navigating
 * back first. showJumpTo={false}: this tab strip already covers "jump to".
 */
interface Props {
  groupId:         string;
  groupName:       string;
  groupType:       string;
  circleMode?:     string | null;
  currency:        string;
  isArchived:      boolean;
  isAdmin:         boolean;
  shareToken?:     string | null;
  groupStartDate?: string | null;
  groupEndDate?:   string | null;
}

export function GroupDesktopNav({
  groupId, groupName, groupType, circleMode,
  currency, isArchived, isAdmin, shareToken, groupStartDate, groupEndDate,
}: Props) {
  const pathname = usePathname();
  const theme = getContextTheme(groupType, circleMode);
  const tabs = getGroupTabs(groupId, groupType);

  const actual = sectionFromPath(pathname);
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { setPending(null); }, [actual]);
  const current = pending ?? actual;

  const [hubOpen, setHubOpen] = useState(false);
  // Scan glow — client-derived from localStorage; circles never show it.
  const [showScanGlow, setShowScanGlow] = useState(false);
  useEffect(() => {
    if (groupType === "circle") return;
    const dismissed = localStorage.getItem(ONBOARDING_KEYS.SCAN_GLOW_DISMISSED) === "1";
    setShowScanGlow(!dismissed);
  }, [groupType]);

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = shareToken ? `${appUrl}/join/${shareToken}` : undefined;

  return (
    <nav
      className="flex items-center h-12 rounded-2xl bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800/60 shadow-sm"
      aria-label="Group sections"
    >
      {/* Group name + ▾ switcher — proper anchored dropdown on desktop (the
          mobile bottom-sheet pattern looked out of place at this width).
          pl-4 gives it breathing room from the bar's now-rounded left edge. */}
      <div className="flex items-center pl-4 shrink-0">
        <GroupSwitcherDropdown
          groupId={groupId}
          groupName={groupName}
          currentSection={current}
          accentClassName={theme.accentText}
        />
      </div>

      <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5 shrink-0" />

      {/* Tabs — centered in the remaining width instead of packed against the
          divider, so they don't look stranded on the left of a now much wider
          rounded bar. */}
      <div className="flex-1 flex items-center justify-center gap-0.5">
        {tabs.map(({ section, label, icon: Icon, href }) => {
          const active = current === section;
          return (
            <Link
              key={section || "overview"}
              href={href}
              // Same replace logic as GroupBottomNav: section↔section swaps replace so
              // the back button exits the group rather than cycling sibling pages.
              replace={actual !== ""}
              onClick={() => setPending(section)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-1.5 px-3 h-12 text-sm font-medium transition-colors",
                active
                  ? theme.accentText
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && (
                <span className={cn("absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r", theme.gradient)} />
              )}
            </Link>
          );
        })}
      </div>

      {/* ⋯ manage — Edit/Archive/Share, available on every in-group page
          (matches GroupMobileNav's parity, not just the Overview hero). */}
      <button
        type="button"
        onClick={() => setHubOpen(true)}
        className="mr-2 shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
        aria-label="Group actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      <GroupActionHub
        isOpen={hubOpen}
        onClose={() => setHubOpen(false)}
        groupId={groupId}
        groupName={groupName}
        groupType={groupType}
        circleMode={circleMode}
        currency={currency}
        isArchived={isArchived}
        isAdmin={isAdmin}
        joinUrl={joinUrl}
        groupStartDate={groupStartDate}
        groupEndDate={groupEndDate}
        showJumpTo={false}
        showScanGlow={showScanGlow}
      />
    </nav>
  );
}
