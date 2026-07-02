// Shared logic between GroupSwitcherSheet (mobile) and GroupSwitcherDropdown
// (desktop) — both switch to another of the user's groups while preserving
// the current section where possible. Pure/testable; no React here.

export interface SwitcherGroupLike {
  groupType: string;
  circleMode?: string | null;
}

export function typeLabel(g: SwitcherGroupLike): string {
  if (g.groupType === "circle") return g.circleMode === "one_time" ? "Circle · One-time" : "Circle · Recurring";
  if (g.groupType === "nest") return "Nest";
  return "Trip";
}

/** Section the target group can honour, given the section you're switching
 *  FROM. Expenses/Members exist for every group type; Settle/Insights don't
 *  exist for Circles, so those fall back to the target's overview ("").
 *  Any other/unknown current section also falls back to overview. */
export function resolveSwitchSection(currentSection: string, targetGroupType: string): string {
  if (currentSection === "expenses" || currentSection === "members") return currentSection;
  if ((currentSection === "settle" || currentSection === "insights") && targetGroupType !== "circle") {
    return currentSection;
  }
  return "";
}

/** Full href for the target group, honouring resolveSwitchSection. */
export function targetHref(targetGroupId: string, currentSection: string, targetGroupType: string): string {
  const section = resolveSwitchSection(currentSection, targetGroupType);
  return section ? `/groups/${targetGroupId}/${section}` : `/groups/${targetGroupId}`;
}

const SWITCHER_SECTION_KEY = "clearSwitcherSection";

/** Stashes the target section so the landing group's own nav effect
 *  (GroupMobileNav / GroupDesktopNav) can push it once mounted there —
 *  see group-switcher-sheet.tsx for the full two-step history rationale.
 *  Silently no-ops on quota errors / private browsing. */
export function stashSwitcherSection(groupId: string, section: string): void {
  try {
    sessionStorage.setItem(SWITCHER_SECTION_KEY, JSON.stringify({ groupId, section }));
  } catch { /* quota / private browsing — ignore */ }
}
