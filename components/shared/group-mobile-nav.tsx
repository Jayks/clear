"use client";

import { useState } from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { TripCardNavSheet } from "@/components/trip/trip-card-nav-sheet";
import { usePathname } from "next/navigation";

interface Props {
  groupId: string;
  groupName: string;
}

/**
 * Derive centre label and back-link from the current pathname.
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
  // parts after stripping leading "/"
  // ["groups", groupId, section, a?, b?]
  const parts = pathname.replace(/^\//, "").split("/");
  const section = parts[2]; // e.g. "expenses"
  const a       = parts[3]; // e.g. "new" | expenseId | "templates"
  const b       = parts[4]; // e.g. "edit" | "thread" | "new"

  const groupBase = `/groups/${groupId}`;

  // Group overview
  if (!section) {
    return { pageTitle: null, backHref: "/groups", backLabel: "Groups" };
  }

  // Edit group
  if (section === "edit") {
    return { pageTitle: "Edit group", backHref: groupBase, backLabel: groupName };
  }

  // Expenses tree
  if (section === "expenses") {
    if (!a)              return { pageTitle: "Expenses",      backHref: groupBase,               backLabel: groupName  };
    if (a === "new")     return { pageTitle: "Add expense",   backHref: `${groupBase}/expenses`, backLabel: "Expenses" };
    if (a === "templates") {
      const title = b === "edit" ? "Edit template" : "Add template";
      return { pageTitle: title, backHref: `${groupBase}/expenses`, backLabel: "Expenses" };
    }
    if (b === "edit")    return { pageTitle: "Edit expense",  backHref: `${groupBase}/expenses`, backLabel: "Expenses" };
    if (b === "thread")  return { pageTitle: "Thread",        backHref: `${groupBase}/expenses`, backLabel: "Expenses" };
    return               { pageTitle: "Expenses",             backHref: groupBase,               backLabel: groupName  };
  }

  // Other top-level sections
  const LABELS: Record<string, string> = {
    members:  "Members",
    settle:   "Settle up",
    insights: "Insights",
  };
  if (LABELS[section]) {
    return { pageTitle: LABELS[section], backHref: groupBase, backLabel: groupName };
  }

  // Unknown — safe fallback
  return { pageTitle: null, backHref: "/groups", backLabel: "Groups" };
}

export function GroupMobileNav({ groupId, groupName }: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const { pageTitle, backHref, backLabel } = resolveNav(pathname, groupId, groupName);

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

        {/* Current page / group name — centred */}
        <p
          className="flex-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-100 truncate px-1"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {pageTitle ?? groupName}
        </p>

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
