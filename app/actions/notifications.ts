"use server";

import { getCurrentUser } from "@/lib/db/queries/auth";
import {
  getNotifications,
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
  return getNotifications(user.id, opts);
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
