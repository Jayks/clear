"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MoreHorizontal, ChevronDown, Receipt, Wallet, Users, BarChart2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GroupActionHub } from "@/components/trip/group-action-hub";
import { GroupSwitcherSheet } from "@/components/shared/group-switcher-sheet";
import { getContextTheme } from "@/lib/theme/context-theme";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  groupId:         string;
  groupName:       string;
  groupType:       string;  // 'trip' | 'nest' | 'circle'
  circleMode?:     string | null;  // 'recurring' | 'one_time' (circles only)
  currency:        string;
  isArchived:      boolean;
  isAdmin:         boolean;
  shareToken?:     string | null;
  groupStartDate?: string | null;
  groupEndDate?:   string | null;
}

/**
 * Section icon for each top-level page. The colour comes from the group's
 * context (getContextTheme), not the section — the icon differentiates the
 * sub-page, the colour says which group you're in.
 */
const SECTION_ICON: Record<string, LucideIcon> = {
  expenses: Receipt,
  members:  Users,
  settle:   Wallet,
  insights: BarChart2,
};

interface NavResolve {
  /** true → centre shows the group name + ▾ switcher (group-level pages); the
   *  bottom nav indicates the section. false → centre shows the task title. */
  switcher: boolean;
  /** current top-level section key ("" overview) — for the switcher's
   *  section-preserving target. */
  section: string;
  /** task title for deep pages (when !switcher). */
  pageTitle: string | null;
  icon?: LucideIcon;
  backHref: string;
  backLabel: string;
}

/**
 * Derive the header layout from the pathname.
 *
 * Group-level pages (overview + the four section indexes) show the group name +
 * ▾ switcher and climb one level on Back (section → overview → Home) — the
 * highlighted bottom-nav tab tells you which section you're on. Deep task pages
 * show their own title + section icon and Back returns to their parent list.
 *
 * URL structure (all under /groups/[groupId]):
 *   /groups/[id]                                → overview        (switcher · ‹ Home)
 *   /groups/[id]/expenses|settle|members|insights → section       (switcher · ‹ Overview)
 *   /groups/[id]/edit                           → Edit group      (‹ Overview)
 *   /groups/[id]/expenses/new                   → Add expense     (‹ Expenses)
 *   /groups/[id]/expenses/[eid]/edit            → Edit expense    (‹ Expenses)
 *   /groups/[id]/expenses/[eid]/thread          → Thread          (‹ Expenses)
 *   /groups/[id]/expenses/templates/new|[tid]/edit → recurring    (‹ Expenses)
 */
function resolveNav(pathname: string, groupId: string): NavResolve {
  const parts = pathname.replace(/^\//, "").split("/");
  const section = parts[2];
  const a       = parts[3];
  const b       = parts[4];
  const c       = parts[5];

  const groupBase = `/groups/${groupId}`;

  // ── Group-level pages → group-name switcher; Back climbs one level ──
  if (!section) {
    return { switcher: true, section: "", pageTitle: null, backHref: "/groups", backLabel: "Home" };
  }
  if (section === "members" || section === "settle" || section === "insights") {
    return { switcher: true, section, pageTitle: null, backHref: groupBase, backLabel: "Overview" };
  }
  if (section === "expenses" && !a) {
    return { switcher: true, section: "expenses", pageTitle: null, backHref: groupBase, backLabel: "Overview" };
  }

  // ── Deep task pages → task title + section icon, Back to parent, no switcher ──
  if (section === "edit") {
    return { switcher: false, section: "", pageTitle: "Edit group", backHref: groupBase, backLabel: "Overview" };
  }
  if (section === "expenses") {
    if (a === "new") return { switcher: false, section: "expenses", pageTitle: "Add expense", icon: SECTION_ICON.expenses, backHref: `${groupBase}/expenses`, backLabel: "Expenses" };
    if (a === "templates") {
      const title = c === "edit" ? "Edit recurring expense" : "Add recurring expense";
      return { switcher: false, section: "expenses", pageTitle: title, icon: SECTION_ICON.expenses, backHref: `${groupBase}/expenses`, backLabel: "Expenses" };
    }
    if (b === "edit")   return { switcher: false, section: "expenses", pageTitle: "Edit expense", icon: SECTION_ICON.expenses, backHref: `${groupBase}/expenses`, backLabel: "Expenses" };
    if (b === "thread") return { switcher: false, section: "expenses", pageTitle: "Thread", backHref: `${groupBase}/expenses`, backLabel: "Expenses" };
    return { switcher: true, section: "expenses", pageTitle: null, backHref: groupBase, backLabel: "Overview" };
  }

  return { switcher: false, section: "", pageTitle: null, backHref: "/groups", backLabel: "Home" };
}

export function GroupMobileNav({
  groupId, groupName,
  groupType, circleMode, currency, isArchived, isAdmin,
  shareToken, groupStartDate, groupEndDate,
}: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  // Stable reference — prevents the history useEffect in GroupActionHub from
  // re-running (and re-pushing fake history entries) on every re-render.
  const handleClose = useCallback(() => setNavOpen(false), []);

  // Close the switcher once a switch commits (groupId prop changes).
  useEffect(() => { setSwitcherOpen(false); }, [groupId]);

  // After a group-switch, GroupSwitcherSheet stores the target section in
  // sessionStorage and replaces to the group overview.  Once we land there
  // (groupId matches + pathname is exactly the overview URL) we push the
  // section, giving history: [..., /groups/A/X, /groups/B, /groups/B/X].
  // Browser back then lands on /groups/B overview ✓
  useEffect(() => {
    if (pathname !== `/groups/${groupId}`) return; // not on the overview
    let parsed: { groupId: string; section: string } | null = null;
    try {
      const raw = sessionStorage.getItem("clearSwitcherSection");
      if (raw) parsed = JSON.parse(raw) as { groupId: string; section: string };
    } catch { /* ignore */ }
    if (!parsed || parsed.groupId !== groupId || !parsed.section) return;
    // Clear before pushing — if push fails the user is on the overview, which
    // is a safe state; stale storage would cause an unexpected redirect later.
    sessionStorage.removeItem("clearSwitcherSection");
    router.push(`/groups/${groupId}/${parsed.section}`);
  }, [pathname, groupId, router]);

  // Colour follows the group's context, not the section — the section icon
  // differentiates the sub-page.
  const theme = getContextTheme(groupType, circleMode);

  const { switcher, section, pageTitle, backHref, backLabel, icon: SectionIcon } = resolveNav(pathname, groupId);

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = shareToken ? `${appUrl}/join/${shareToken}` : undefined;

  return (
    <>
      {/* Three-column flex: back (shrinks) · title (flex-1, centred) · ⋯.
          The title gets all the room between the two controls so long page
          names ("Add recurring expense") aren't cramped into a fixed 55%. */}
      <div className="h-14 px-3 flex items-center gap-1.5 backdrop-blur-sm">
        {/* Back button — HIERARCHICAL: always goes to the structural parent
            (`backHref` from resolveNav), never `router.back()`. With the
            contextual bottom nav letting users hop between sub-pages freely,
            history-based back felt like going in circles; this always lands on a
            predictable parent — sub-pages → group overview, deep pages (add/edit/
            thread/templates) → their list — matching the label shown. */}
        <a
          href={backHref}
          onClick={(e) => { e.preventDefault(); router.push(backHref); }}
          className={`flex items-center gap-1 text-xs font-medium ${theme.accentText} hover:opacity-80 transition-opacity py-3 shrink min-w-0 max-w-[34%]`}
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{backLabel}</span>
        </a>

        {/* Centre — group-name switcher on group-level pages, task title on deep
            pages. The bottom nav indicates which section you're on. */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {switcher ? (
            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              className="flex items-center gap-1 min-w-0 rounded-lg px-2 py-1 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
              aria-label={`Switch group — currently ${groupName}`}
              aria-haspopup="dialog"
            >
              <span
                className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {groupName}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 ${theme.accentText}`} />
            </button>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              {SectionIcon && (
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
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
          )}
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
        circleMode={circleMode}
        currency={currency}
        isArchived={isArchived}
        isAdmin={isAdmin}
        joinUrl={joinUrl}
        groupStartDate={groupStartDate}
        groupEndDate={groupEndDate}
        showJumpTo={false}
      />

      <GroupSwitcherSheet
        isOpen={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        currentGroupId={groupId}
        currentSection={section}
      />
    </>
  );
}
