"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { NOTIFICATIONS_READ_EVENT } from "@/lib/notifications/notification-sync";
import type { NotificationsReadDetail } from "@/lib/notifications/notification-sync";
import type { Notification } from "@/lib/db/schema/notifications";

/**
 * Subscribes to `NOTIFICATIONS_READ_EVENT` broadcasts and applies them to
 * this surface's own local state — including broadcasts this same surface
 * triggered (a `window.dispatchEvent` reaches every listener on the window,
 * itself included), so each of the 3 notification surfaces has exactly one
 * state-mutation code path instead of duplicating it inline. `setUnread` is
 * optional — the full /notifications page has no badge of its own to update,
 * just its cached list.
 */
export function useNotificationReadSync<T extends Notification[] | null>(
  setNotifications: Dispatch<SetStateAction<T>>,
  setUnread?: Dispatch<SetStateAction<number>>,
) {
  useEffect(() => {
    function onRead(e: Event) {
      const { detail } = e as CustomEvent<NotificationsReadDetail>;
      if (detail.scope === "all") {
        setUnread?.(0);
        setNotifications(
          (prev) => (prev ? prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date() })) : prev) as T,
        );
      } else {
        setUnread?.((u) => Math.max(0, u - 1));
        setNotifications(
          (prev) =>
            (prev
              ? prev.map((n) => (n.id === detail.id && !n.readAt ? { ...n, readAt: new Date() } : n))
              : prev) as T,
        );
      }
    }
    window.addEventListener(NOTIFICATIONS_READ_EVENT, onRead);
    return () => window.removeEventListener(NOTIFICATIONS_READ_EVENT, onRead);
  }, [setNotifications, setUnread]);
}
