"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationList } from "./notification-list";
import { getNotificationsAction, markAllNotificationsReadAction } from "@/app/actions/notifications";
import { broadcastNotificationsRead } from "@/lib/notifications/notification-sync";
import { useNotificationReadSync } from "@/hooks/use-notification-read-sync";
import type { Notification } from "@/lib/db/schema/notifications";

/**
 * Desktop bell — sits in AppSidebar's bottom cluster (Bell → ThemeToggle →
 * Avatar). Anchored dropdown opens `side="top"` (2026-07-03) — above the
 * bottom cluster rather than sideways into the content column, unlike the
 * avatar menu right next to it (which still uses `side="right"` — its
 * content is short enough that sideways reads fine, whereas the notification
 * list is taller and read better stacked above the row it came from).
 * Lazy-loads the last 10 notifications on first open — zero cost on every
 * other page load.
 */
export function NotificationBellDesktop({ initialUnread }: { initialUnread: number }) {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [marking, setMarking] = useState(false);

  // Keeps this bell's badge + cached list in sync with reads that happen on
  // the *other* two notification surfaces (mobile bell, full /notifications
  // page) — see lib/notifications/notification-sync.ts for why this is
  // needed (all three are mounted simultaneously, with independent state).
  useNotificationReadSync(setNotifications, setUnread);

  async function handleOpenChange(open: boolean) {
    if (open && notifications === null) {
      const rows = await getNotificationsAction({ limit: 10 });
      setNotifications(rows);
    }
  }

  async function handleMarkAllRead() {
    setMarking(true);
    await markAllNotificationsReadAction().catch(() => {});
    setMarking(false);
    broadcastNotificationsRead({ scope: "all" });
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors"
            aria-label={unread > 0 ? `Notifications — ${unread} unread` : "Notifications"}
          />
        }
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      {/* side="top": opens above the bottom cluster (Bell → ThemeToggle →
          Avatar) instead of sideways into the content column; align="start"
          keeps the panel's left edge flush with the bell, which sits at the
          sidebar's left edge, so it never extends past the viewport's left
          side. */}
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-80 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-black/8 dark:shadow-black/40 rounded-xl"
      >
        <div className="flex items-center justify-between px-1.5 py-1">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Notifications</p>
        </div>
        {notifications === null ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">You&apos;re all caught up.</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <NotificationList
              notifications={notifications}
              marking={marking}
              onMarkAllRead={handleMarkAllRead}
              renderItem={(row) => <DropdownMenuItem render={row} className="p-0 focus:bg-transparent" />}
            />
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/notifications" />} className="flex items-center justify-center py-2 cursor-pointer text-sm font-medium text-cyan-600 dark:text-cyan-400">
          View all →
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
