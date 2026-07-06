"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { NOTIFICATIONS_READ_EVENT, broadcastNotificationsRead } from "@/lib/notifications/notification-sync";
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

/**
 * Shared "Mark all read" trigger — was duplicated identically across all
 * three notification surfaces (desktop bell, mobile bell, full
 * /notifications page), and all three had the same bug (Round 16 fix #11):
 * `.catch(() => {})` swallowed a failed `markAllNotificationsReadAction`
 * call and broadcast the "read" event unconditionally anyway, so a failure
 * (e.g. offline) still visually cleared every badge/list even though
 * nothing was actually marked read server-side. Now only broadcasts on a
 * genuine `{ ok: true }`; on failure, shows a toast and leaves state as-is
 * (the surfaces' own optimistic state is simply not touched, so nothing
 * appears to have changed).
 */
export function useMarkAllRead() {
  const [marking, setMarking] = useState(false);

  async function handleMarkAllRead() {
    setMarking(true);
    const result = await markAllNotificationsReadAction().catch(() => ({ ok: false }) as const);
    setMarking(false);
    if (result.ok) {
      broadcastNotificationsRead({ scope: "all" });
    } else {
      toast.error("Couldn't mark notifications read");
    }
  }

  return { marking, handleMarkAllRead };
}
