/**
 * isNavItemActive — whether a bottom-nav tab is the active one for the current
 * path. Active when the path is exactly the tab's href OR a descendant of it
 * (`href` + "/…"). The trailing-slash guard prevents a sibling prefix like
 * `/insightsfoo` from falsely matching `/insights`.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
