"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Building2, Coins, ChevronDown, ChevronRight, Loader2, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getContextTheme } from "@/lib/theme/context-theme";
import { getSwitcherGroups, type SwitcherGroup } from "@/app/actions/groups";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Desktop counterpart to GroupSwitcherSheet (mobile). Same data fetch +
 * section-preserving navigation logic, but a proper anchored dropdown menu —
 * opened by GroupDesktopNav's "group name ▾" button — instead of reusing the
 * mobile bottom-sheet pattern, which looked like a misplaced mobile control
 * on a wide desktop viewport.
 *
 * Lazy-fetches the group list on first open via the same getSwitcherGroups()
 * action the mobile sheet uses (no cost on normal page loads).
 */
interface Props {
  groupId: string;
  groupName: string;
  currentSection: string;
  /** Theme accent class for the chevron — matches the current group's context colour. */
  accentClassName: string;
}

const TYPE_ICON: Record<string, LucideIcon> = { trip: MapPin, nest: Building2, circle: Coins };

function typeLabel(g: SwitcherGroup): string {
  if (g.groupType === "circle") return g.circleMode === "one_time" ? "Circle · One-time" : "Circle · Recurring";
  if (g.groupType === "nest") return "Nest";
  return "Trip";
}

export function GroupSwitcherDropdown({ groupId, groupName, currentSection, accentClassName }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState<SwitcherGroup[] | null>(null);

  // Section the target group can honour (falls back to overview when invalid) —
  // same rule as the mobile sheet: keep expenses/members always, settle/insights
  // only for non-circle targets (circles have no Settle/Insights pages).
  function targetHref(g: SwitcherGroup): string {
    const s = currentSection;
    const keep =
      s === "expenses" || s === "members"
        ? s
        : (s === "settle" || s === "insights") && g.groupType !== "circle"
          ? s
          : "";
    return keep ? `/groups/${g.id}/${keep}` : `/groups/${g.id}`;
  }

  function handleOpenChange(open: boolean) {
    if (open && groups === null) {
      getSwitcherGroups().then(setGroups).catch(() => setGroups([]));
    }
  }

  // Same sessionStorage two-step handshake as GroupSwitcherSheet: replace to
  // the target's overview, stash the section, let GroupMobileNav/GroupDesktopNav's
  // own landing effect push the section once mounted there. See group-switcher-sheet.tsx
  // for the full history-shape rationale.
  function handleSelect(g: SwitcherGroup) {
    const sectionHref  = targetHref(g);
    const overviewHref = `/groups/${g.id}`;

    if (sectionHref !== overviewHref) {
      const section = sectionHref.slice(overviewHref.length + 1);
      try {
        sessionStorage.setItem("clearSwitcherSection", JSON.stringify({ groupId: g.id, section }));
      } catch { /* quota / private browsing — ignore */ }
    }
    router.replace(overviewHref);
  }

  const others = (groups ?? []).filter((g) => g.id !== groupId);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors min-w-0"
            aria-label={`Switch group — currently ${groupName}`}
          />
        }
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[180px]" style={{ fontFamily: "var(--font-fraunces)" }}>
          {groupName}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 ${accentClassName}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-72 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-black/8 dark:shadow-black/40 rounded-xl">
        {/* Plain text, not DropdownMenuLabel — that primitive (base-ui's
            Menu.GroupLabel) requires a <Menu.Group> ancestor; this header
            doesn't need the grouping semantics, just the matching style. */}
        <p className="px-1.5 py-1 text-xs font-medium text-slate-400 dark:text-slate-500">Switch group</p>
        {groups === null ? (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : others.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">No other groups yet.</p>
        ) : (
          others.map((g) => {
            const theme = getContextTheme(g.groupType, g.circleMode);
            const Icon = TYPE_ICON[g.groupType] ?? MapPin;
            return (
              <DropdownMenuItem
                key={g.id}
                render={<Link href={targetHref(g)} onClick={(e) => { e.preventDefault(); handleSelect(g); }} />}
                className="flex items-center gap-2.5 px-1.5 py-2 cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{g.name}</p>
                  <p className={`text-xs ${theme.accentText} truncate`}>{typeLabel(g)}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/groups" />} className="flex items-center gap-2.5 px-1.5 py-2 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">All groups</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
