"use client";

import { Fragment } from "react";
import { NotificationRow } from "@/components/notifications/notification-row";
import type { Notification } from "@/lib/db/schema/notifications";

interface Props {
  notifications: Notification[];
  /** Compact = dropdown/sheet row. Full = the /notifications page row. */
  variant?: "compact" | "full";
  /** Bell surfaces only — decrements/zeroes their local unread badge state. */
  onRowOpen?: (notification: Notification) => void;
  marking: boolean;
  onMarkAllRead: () => void;
  /** Desktop bell only — wraps each row in a `DropdownMenuItem` so it keeps
   *  the base-ui Menu's arrow-key nav + auto-close-on-select semantics.
   *  Defaults to rendering the row unwrapped (mobile sheet / full page). */
  renderItem?: (row: React.ReactElement, notification: Notification) => React.ReactNode;
}

/**
 * Shared read/unread grouping used identically by the desktop bell dropdown,
 * mobile bell sheet, and the full /notifications page — same sharing
 * rationale as NotificationRow itself. Partitions the already-fetched list
 * (no extra query) into "New" (unread) and "Earlier" (read), preserving each
 * bucket's existing reverse-chronological order. "Mark all read" lives
 * inside the New header so it visibly only ever acts on the unread group.
 * "Earlier" only gets its own header when there's actually something to
 * segregate it from — an all-unread or all-read list renders as one plain
 * group, matching the previous flat-list behavior in those cases.
 */
export function NotificationList({ notifications, variant = "compact", onRowOpen, marking, onMarkAllRead, renderItem }: Props) {
  const unread = notifications.filter((n) => !n.readAt);
  const read = notifications.filter((n) => n.readAt);

  function renderGroup(rows: Notification[]) {
    return rows.map((n) => {
      const row = <NotificationRow notification={n} onOpen={onRowOpen} variant={variant} />;
      return <Fragment key={n.id}>{renderItem ? renderItem(row, n) : row}</Fragment>;
    });
  }

  return (
    <div className="space-y-3">
      {unread.length > 0 && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between px-1.5 pb-1">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">New</p>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={marking}
              className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50"
            >
              {marking ? "Marking…" : "Mark all read"}
            </button>
          </div>
          {renderGroup(unread)}
        </div>
      )}

      {read.length > 0 && (
        <div className="space-y-0.5">
          {unread.length > 0 && (
            <p className="px-1.5 pb-1 text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Earlier
            </p>
          )}
          {renderGroup(read)}
        </div>
      )}
    </div>
  );
}
