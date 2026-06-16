"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContextTheme } from "@/lib/theme/context-theme";
import { getGroupTabs, sectionFromPath } from "@/lib/nav/group-tabs";
import { GroupSwitcherSheet } from "./group-switcher-sheet";

/**
 * Desktop in-group tab strip (md+ only). The desktop counterpart of the mobile
 * GroupBottomNav: lateral movement between the group's pages, plus the group
 * name + ▾ switcher. Rendered sticky below AppNav by the group layout.
 *
 * Active tab gets a context-coloured underline. Optimistic active (like the
 * bottom nav) so the indicator moves on click, not after the route commits.
 */
interface Props {
  groupId: string;
  groupName: string;
  groupType: string;
  circleMode?: string | null;
}

export function GroupDesktopNav({ groupId, groupName, groupType, circleMode }: Props) {
  const pathname = usePathname();
  const theme = getContextTheme(groupType, circleMode);
  const tabs = getGroupTabs(groupId, groupType);

  const actual = sectionFromPath(pathname);
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { setPending(null); }, [actual]);
  const current = pending ?? actual;

  const [switcherOpen, setSwitcherOpen] = useState(false);
  useEffect(() => { setSwitcherOpen(false); }, [groupId]);

  return (
    <nav
      className="flex items-center gap-1 h-12 px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800/60"
      aria-label="Group sections"
    >
      {/* Group name + ▾ switcher */}
      <button
        type="button"
        onClick={() => setSwitcherOpen(true)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 -ml-1 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors min-w-0"
        aria-label={`Switch group — currently ${groupName}`}
        aria-haspopup="dialog"
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[180px]" style={{ fontFamily: "var(--font-fraunces)" }}>
          {groupName}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 ${theme.accentText}`} />
      </button>

      <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5 shrink-0" />

      {/* Tabs */}
      <div className="flex items-center gap-0.5">
        {tabs.map(({ section, label, icon: Icon, href }) => {
          const active = current === section;
          return (
            <Link
              key={section || "overview"}
              href={href}
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

      <GroupSwitcherSheet
        isOpen={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        currentGroupId={groupId}
        currentSection={current}
      />
    </nav>
  );
}
