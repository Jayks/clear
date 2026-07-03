"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { NotificationList } from "@/components/notifications/notification-list";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { broadcastNotificationsRead } from "@/lib/notifications/notification-sync";
import { useNotificationReadSync } from "@/hooks/use-notification-read-sync";
import type { Notification } from "@/lib/db/schema/notifications";

interface Props {
  initialNotifications: Notification[];
  page: number;
  hasNext: boolean;
}

export function NotificationsPageClient({ initialNotifications, page, hasNext }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [marking, setMarking] = useState(false);

  // This page has no badge of its own, but still needs to (a) react when a
  // notification is read from a bell while this page happens to be open,
  // and (b) broadcast its own "mark all read" so the sidebar/nav bells'
  // badge + cached list update immediately too — see
  // lib/notifications/notification-sync.ts for why this is needed (the
  // bells are mounted in the persistent layout wrapping this page).
  useNotificationReadSync(setNotifications);

  async function handleMarkAllRead() {
    setMarking(true);
    await markAllNotificationsReadAction().catch(() => {});
    setMarking(false);
    broadcastNotificationsRead({ scope: "all" });
  }

  return (
    <div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center mb-4">
            <Bell className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
          </div>
          <h2 className="text-lg text-slate-700 dark:text-slate-200 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
            {page > 1 ? "Nothing here" : "You're all caught up"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {page > 1 ? "No notifications on this page." : "New activity will show up here."}
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-1.5">
          <NotificationList
            notifications={notifications}
            variant="full"
            marking={marking}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>
      )}

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between mt-4">
          {page > 1 ? (
            <Link
              href={`/notifications?page=${page - 1}`}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              href={`/notifications?page=${page + 1}`}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
