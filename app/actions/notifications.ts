"use server";

import { getCurrentUser } from "@/lib/db/queries/auth";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/db/queries/notifications";
import type { Notification } from "@/lib/db/schema/notifications";

/** Lazy-load feed for the bell dropdown/sheet (last N) and the full page
 *  (limit + offset). Auth-checked here since this is a client-callable action. */
export async function getNotificationsAction(
  opts: { limit: number; offset?: number } = { limit: 10 },
): Promise<Notification[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  // Own-rows only, but clamp anyway (opportunistic — noted as a deferred
  // item in BUG_FIX_ROUND16_PLAN.md): a client-supplied limit/offset is
  // otherwise unbounded.
  const limit = Math.min(Math.max(opts.limit, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);
  return getNotifications(user.id, { limit, offset });
}

/** Round 16 fix #5: one round-trip that refreshes both the cached list and
 *  the badge count — used by both bells on EVERY open (not just the first),
 *  so a long-lived tab/PWA doesn't show morning data all day. */
export async function getNotificationFeedAction(
  opts: { limit: number } = { limit: 10 },
): Promise<{ rows: Notification[]; unread: number }> {
  const user = await getCurrentUser();
  if (!user) return { rows: [], unread: 0 };
  const limit = Math.min(Math.max(opts.limit, 1), 50);
  const [rows, unread] = await Promise.all([
    getNotifications(user.id, { limit }),
    getUnreadNotificationCount(user.id),
  ]);
  return { rows, unread };
}

export async function markNotificationReadAction(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await markNotificationRead(id, user.id);
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await markAllNotificationsRead(user.id);
  return { ok: true };
}
