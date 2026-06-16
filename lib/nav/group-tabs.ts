import { LayoutDashboard, Receipt, Wallet, Users, BarChart2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Single source of truth for a group's in-group navigation tabs — shared by the
 * mobile contextual bottom nav (`GroupBottomNav`) and the desktop tab strip
 * (`GroupDesktopNav`) so the two can never drift.
 *
 * Circle-aware: circles have no Settle/Insights pages (mirrors the GroupActionHub
 * "Jump to" reduction), so they get Overview · Expenses · Members.
 */
export interface GroupTab {
  /** path segment after /groups/[id] — "" for the overview */
  section: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export function getGroupTabs(groupId: string, groupType: string): GroupTab[] {
  const base = `/groups/${groupId}`;
  const tabs: GroupTab[] = [
    { section: "",         label: "Overview", icon: LayoutDashboard, href: base },
    { section: "expenses", label: "Expenses", icon: Receipt,         href: `${base}/expenses` },
    { section: "settle",   label: "Settle",   icon: Wallet,          href: `${base}/settle` },
    { section: "members",  label: "Members",  icon: Users,           href: `${base}/members` },
    { section: "insights", label: "Insights", icon: BarChart2,       href: `${base}/insights` },
  ];
  if (groupType === "circle") {
    return tabs.filter((t) => t.section === "" || t.section === "expenses" || t.section === "members");
  }
  return tabs;
}

/** Current section key from a pathname ("" = overview). */
export function sectionFromPath(pathname: string): string {
  return pathname.replace(/^\//, "").split("/")[2] ?? "";
}
