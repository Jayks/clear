"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, MoreHorizontal, Receipt, Wallet, Users, BarChart2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GroupActionHub } from "@/components/trip/group-action-hub";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  groupId:         string;
  groupName:       string;
  groupType:       string;  // 'trip' | 'nest' | 'circle'
  currency:        string;
  isArchived:      boolean;
  isAdmin:         boolean;
  shareToken?:     string | null;
  groupStartDate?: string | null;
  groupEndDate?:   string | null;
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
  const c       = parts[5];

  const groupBase = `/groups/${groupId}`;

  // Group overview
  if (!section) {
    return { pageTitle: null, backHref: "/groups", backLabel: "Home", icon: undefined, gradient: undefined };
  }

  // Edit group
  if (section === "edit") {
    return { pageTitle: "Edit group", backHref: groupBase, backLabel: groupName, icon: undefined, gradient: undefined };
  }

  // Expenses tree — only the index gets the section icon; deep pages don't
  if (section === "expenses") {
    if (!a) return { pageTitle: "Expenses", backHref: groupBase, backLabel: groupName, ...SECTION_META.expenses };
    if (a === "new") return { pageTitle: "Add expense",  backHref: `${groupBase}/expenses`, backLabel: "Expenses", ...SECTION_META.expenses };
    if (a === "templates") {
      const title = c === "edit" ? "Edit recurring expense" : "Add recurring expense";
      return { pageTitle: title, backHref: `${groupBase}/expenses`, backLabel: "Expenses", ...SECTION_META.expenses };
    }
    if (b === "edit")   return { pageTitle: "Edit expense", backHref: `${groupBase}/expenses`, backLabel: "Expenses", ...SECTION_META.expenses };
    if (b === "thread") return { pageTitle: "Thread",        backHref: `${groupBase}/expenses`, backLabel: "Expenses", icon: undefined, gradient: undefined };
    return { pageTitle: "Expenses", backHref: groupBase, backLabel: groupName, ...SECTION_META.expenses };
  }

  // Other top-level sections — all get their section icon
  const LABELS: Record<string, string> = { members: "Members", settle: "Settle up", insights: "Insights" };
  if (LABELS[section]) {
    return { pageTitle: LABELS[section], backHref: groupBase, backLabel: groupName, ...SECTION_META[section] };
  }

  return { pageTitle: null, backHref: "/groups", backLabel: "Home", icon: undefined, gradient: undefined };
}

export function GroupMobileNav({
  groupId, groupName,
  groupType, currency, isArchived, isAdmin,
  shareToken, groupStartDate, groupEndDate,
}: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  // Stable reference — prevents the history useEffect in GroupActionHub from
  // re-running (and re-pushing fake history entries) on every re-render.
  const handleClose = useCallback(() => setNavOpen(false), []);

  const { pageTitle, backHref, backLabel, icon: SectionIcon, gradient } = resolveNav(pathname, groupId, groupName);

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = shareToken ? `${appUrl}/join/${shareToken}` : undefined;

  return (
    <>
      {/* relative so the absolutely-centred title anchors to the bar, not the page */}
      <div className="h-14 px-4 flex items-center justify-between gap-2 backdrop-blur-sm relative">
        {/* Back button — router.back() pops the stack so hardware back never loops */}
        <a
          href={backHref}
          onClick={(e) => { e.preventDefault(); router.back(); }}
          className="relative z-10 flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors py-3 shrink-0 max-w-[30%] min-w-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{backLabel}</span>
        </a>

        {/* Centre — absolutely anchored, prominent icon + title */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 max-w-[55%] min-w-0">
            {SectionIcon && gradient && (
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                <SectionIcon className="w-4 h-4 text-white" />
              </div>
            )}
            <p
              className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {pageTitle ?? groupName}
            </p>
          </div>
        </div>

        {/* Section navigator */}
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="relative z-10 flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors shrink-0"
          aria-label="Group actions"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <GroupActionHub
        isOpen={navOpen}
        onClose={handleClose}
        groupId={groupId}
        groupName={groupName}
        groupType={groupType}
        currency={currency}
        isArchived={isArchived}
        isAdmin={isAdmin}
        joinUrl={joinUrl}
        groupStartDate={groupStartDate}
        groupEndDate={groupEndDate}
      />
    </>
  );
}
