"use client";

import { useState } from "react";
import { ArrowLeft, MoreHorizontal, Receipt, Wallet, Users, BarChart2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { TripCardNavSheet } from "@/components/trip/trip-card-nav-sheet";
import { usePathname } from "next/navigation";

interface Props {
  groupId: string;
  groupName: string;
}

/** Icon + gradient for each top-level section that has a coloured page header */
const SECTION_META: Record<string, { icon: LucideIcon; gradient: string }> = {
  expenses: { icon: Receipt,   gradient: "from-cyan-500 to-teal-500"     },
  members:  { icon: Users,     gradient: "from-violet-500 to-purple-500" },
  settle:   { icon: Wallet,    gradient: "from-emerald-500 to-green-500" },
  insights: { icon: BarChart2, gradient: "from-amber-500 to-orange-400"  },
};

/**
 * Derive centre label, back-link, and optional section icon from the current pathname.
 *
 * URL structure (all under /groups/[groupId]):
 *   /groups/[id]                              → group overview
 *   /groups/[id]/edit                         → Edit group
 *   /groups/[id]/expenses                     → Expenses
 *   /groups/[id]/expenses/new                 → Add expense
 *   /groups/[id]/expenses/[eid]/edit          → Edit expense
 *   /groups/[id]/expenses/[eid]/thread        → Thread
 *   /groups/[id]/expenses/templates/new       → Add template
 *   /groups/[id]/expenses/templates/[tid]/edit→ Edit template
 *   /groups/[id]/members                      → Members
 *   /groups/[id]/settle                       → Settle up
 *   /groups/[id]/insights                     → Insights
 */
function resolveNav(pathname: string, groupId: string, groupName: string) {
  const parts = pathname.replace(/^\//, "").split("/");
  const section = parts[2];
  const a       = parts[3];
  const b       = parts[4];

  const groupBase = `/groups/${groupId}`;

  // Group overview
  if (!section) {
    return { pageTitle: null, backHref: "/groups", backLabel: "Groups", icon: undefined, gradient: undefined };
  }

  // Edit group
  if (section === "edit") {
    return { pageTitle: "Edit group", backHref: groupBase, backLabel: groupName, icon: undefined, gradient: undefined };
  }

  // Expenses tree — only the index gets the section icon; deep pages don't
  if (section === "expenses") {
    if (!a) return { pageTitle: "Expenses", backHref: groupBase, backLabel: groupName, ...SECTION_META.expenses };
    if (a === "new") return { pageTitle: "Add expense", backHref: `${groupBase}/expenses`, backLabel: "Expenses", icon: undefined, gradient: undefined };
    if (a === "templates") {
      const title = b === "edit" ? "Edit template" : "Add template";
      return { pageTitle: title, backHref: `${groupBase}/expenses`, backLabel: "Expenses", icon: undefined, gradient: undefined };
    }
    if (b === "edit")   return { pageTitle: "Edit expense", backHref: `${groupBase}/expenses`, backLabel: "Expenses", icon: undefined, gradient: undefined };
    if (b === "thread") return { pageTitle: "Thread",       backHref: `${groupBase}/expenses`, backLabel: "Expenses", icon: undefined, gradient: undefined };
    return { pageTitle: "Expenses", backHref: groupBase, backLabel: groupName, ...SECTION_META.expenses };
  }

  // Other top-level sections — all get their section icon
  const LABELS: Record<string, string> = { members: "Members", settle: "Settle up", insights: "Insights" };
  if (LABELS[section]) {
    return { pageTitle: LABELS[section], backHref: groupBase, backLabel: groupName, ...SECTION_META[section] };
  }

  return { pageTitle: null, backHref: "/groups", backLabel: "Groups", icon: undefined, gradient: undefined };
}

export function GroupMobileNav({ groupId, groupName }: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const { pageTitle, backHref, backLabel, icon: SectionIcon, gradient } = resolveNav(pathname, groupId, groupName);

  return (
    <>
      <div className="h-12 px-4 flex items-center justify-between gap-2 glass-nav">
        {/* iOS-style back: label = name of parent screen */}
        <Link
          href={backHref}
          className="flex items-center gap-1 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors py-3 shrink-0 max-w-[40%] min-w-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">{backLabel}</span>
        </Link>

        {/* Current page / group name — centred, with optional section icon */}
        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 px-1">
          {SectionIcon && gradient && (
            <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
              <SectionIcon className="w-3 h-3 text-white" />
            </div>
          )}
          <p
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {pageTitle ?? groupName}
          </p>
        </div>

        {/* Section navigator */}
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors shrink-0"
          aria-label="Quick navigation"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <TripCardNavSheet
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        groupId={groupId}
        groupName={groupName}
      />
    </>
  );
}
