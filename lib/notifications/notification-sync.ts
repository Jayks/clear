/**
 * Cross-surface read-state sync for the notification inbox. The desktop
 * bell, mobile bell, and full /notifications page each own fully
 * independent local state (unread count + cached list) — `AppSidebar` and
 * `AppNav` are both always mounted (CSS `md:hidden`-toggled, not
 * conditionally rendered — see `app/(app)/layout.tsx`), and the full page
 * lives inside that same persistent layout, so all three are alive at once
 * with no way for a "mark read" on one to reach the others. Same shape of
 * fix as the Stream badge's localStorage + custom-event sync
 * (`clear_stream_has_badge` / `stream-badge-update`) — scoped to a plain
 * `window` CustomEvent (no localStorage persistence needed) since a fresh
 * page load always re-derives truth from the DB via
 * `getUnreadNotificationCount`/`getNotifications` anyway.
 */
export const NOTIFICATIONS_READ_EVENT = "clear-notifications-read";

export type NotificationsReadDetail = { scope: "all" } | { scope: "one"; id: string };

export function broadcastNotificationsRead(detail: NotificationsReadDetail) {
  window.dispatchEvent(new CustomEvent<NotificationsReadDetail>(NOTIFICATIONS_READ_EVENT, { detail }));
}
