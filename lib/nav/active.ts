/**
 * isNavItemActive — whether a bottom-nav tab is the active one for the current
 * path. Active when the path is exactly the tab's href OR a descendant of it
 * (`href` + "/…"). The trailing-slash guard prevents a sibling prefix like
 * `/insightsfoo` from falsely matching `/insights`.
 *
 * `exact` opts out of descendant matching — the tab lights ONLY on its own page,
 * not its sub-routes. Home uses this: a specific group (`/groups/[id]/…`) is a
 * self-contained section with its own `GroupMobileNav`, so the global Home tab
 * shouldn't claim "active" while you're drilled into a group.
 */
export function isNavItemActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}
