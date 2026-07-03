"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getNotificationMeta } from "@/lib/notifications/notification-meta";
import { markNotificationReadAction } from "@/app/actions/notifications";
import { broadcastNotificationsRead } from "@/lib/notifications/notification-sync";
import type { Notification, NotificationType } from "@/lib/db/schema/notifications";

interface Props {
  notification: Notification;
  /** Fired on click with the tapped row — purely for surface-specific side
   *  effects (e.g. closing the mobile sheet). Badge/list read-state sync is
   *  handled centrally by this component's own broadcast below, via
   *  `useNotificationReadSync` in every surface — the parent no longer
   *  needs to decrement anything itself. */
  onOpen?: (notification: Notification) => void;
  /** Compact = dropdown/sheet row (tighter padding, 2-line body clamp).
   *  Full = the /notifications page row (roomier). */
  variant?: "compact" | "full";
}

/** Single notification row — shared across the desktop dropdown, mobile
 *  sheet, and the full /notifications page so the three surfaces render
 *  identically. Tapping a row fires the mark-read call (fire-and-forget,
 *  doesn't block navigation), broadcasts the read so every mounted
 *  notification surface's badge/list stays in sync, and follows the
 *  notification's own deep link. */
export function NotificationRow({ notification, onOpen, variant = "compact" }: Props) {
  const meta = getNotificationMeta(notification.type as NotificationType);
  const Icon = meta.icon;
  const isUnread = !notification.readAt;

  function handleClick() {
    if (isUnread) {
      markNotificationReadAction(notification.id).catch(() => {});
      broadcastNotificationsRead({ scope: "one", id: notification.id });
    }
    onOpen?.(notification);
  }

  return (
    <Link
      href={notification.url}
      onClick={handleClick}
      className={`flex items-start gap-3 rounded-xl transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/60 ${
        variant === "compact" ? "px-2.5 py-2.5" : "px-3 py-3.5"
      } ${isUnread ? "bg-cyan-50/40 dark:bg-cyan-950/20" : ""}`}
    >
      <div className={`w-8 h-8 rounded-lg ${meta.bgClass} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${meta.iconClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isUnread ? "font-semibold text-slate-800 dark:text-slate-100" : "font-medium text-slate-600 dark:text-slate-300"}`}>
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </p>
      </div>
      {isUnread && <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 mt-1.5" aria-hidden />}
    </Link>
  );
}
