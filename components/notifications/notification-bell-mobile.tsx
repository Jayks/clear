"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { Sheet } from "@/components/shared/sheet";
import { NotificationList } from "./notification-list";
import { getNotificationsAction, markAllNotificationsReadAction } from "@/app/actions/notifications";
import { broadcastNotificationsRead } from "@/lib/notifications/notification-sync";
import { useNotificationReadSync } from "@/hooks/use-notification-read-sync";
import type { Notification } from "@/lib/db/schema/notifications";

/**
 * Mobile bell — sits in AppNav's top bar between ThemeToggle and the avatar.
 * Opens a bottom sheet (the `Sheet` primitive — drag-to-dismiss, focus trap,
 * Escape, iOS scroll-lock all come free) instead of the desktop's anchored
 * dropdown, matching GroupSwitcherSheet/GroupSwitcherDropdown's platform split.
 */
export function NotificationBellMobile({ initialUnread }: { initialUnread: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [marking, setMarking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keeps this bell's badge + cached list in sync with reads that happen on
  // the *other* two notification surfaces (desktop bell, full /notifications
  // page) — see lib/notifications/notification-sync.ts for why this is
  // needed (all three are mounted simultaneously, with independent state).
  useNotificationReadSync(setNotifications, setUnread);

  useEffect(() => {
    if (isOpen && notifications === null) {
      getNotificationsAction({ limit: 10 }).then(setNotifications);
    }
  }, [isOpen, notifications]);

  async function handleMarkAllRead() {
    setMarking(true);
    await markAllNotificationsReadAction().catch(() => {});
    setMarking(false);
    broadcastNotificationsRead({ scope: "all" });
  }

  function handleRowOpen() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors"
        aria-label={unread > 0 ? `Notifications — ${unread} unread` : "Notifications"}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <Sheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        ariaLabel="Notifications"
        scrollRef={scrollRef}
        panelClassName="max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pb-1 shrink-0">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
            Notifications
          </p>
          <button onClick={() => setIsOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm px-2 py-1">
            Done
          </button>
        </div>
        <div ref={scrollRef} className="overflow-y-auto px-3 pb-2 min-h-0">
          {notifications === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-10">You&apos;re all caught up.</p>
          ) : (
            <NotificationList
              notifications={notifications}
              onRowOpen={handleRowOpen}
              marking={marking}
              onMarkAllRead={handleMarkAllRead}
            />
          )}
        </div>

        <div className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-slate-800 shrink-0">
          <Link
            href="/notifications"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400"
          >
            View all →
          </Link>
        </div>
      </Sheet>
    </>
  );
}
