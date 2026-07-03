import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema/notifications";
import type { NotificationType, Notification } from "@/lib/db/schema/notifications";
import { eq, and, isNull, desc, count } from "drizzle-orm";

/**
 * Write primitive for the notification inbox. Mirrors `recordAdminActivity`
 * (`lib/db/queries/admin-activity.ts`) exactly — same `ON CONFLICT (dedup_key)
 * DO NOTHING` claim pattern, same "never throws, fails open" posture.
 *
 * Returns `true` when the caller should go ahead and push-notify, `false`
 * only on a genuine dedup conflict (the row already exists for this
 * `dedupKey`). No `dedupKey` given always inserts and always returns `true`.
 */
export async function insertNotification(params: {
  userId:   string;
  groupId?: string;
  type:     NotificationType;
  title:    string;
  body:     string;
  url:      string;
  dedupKey?: string;
}): Promise<boolean> {
  const { userId, groupId, type, title, body, url, dedupKey } = params;
  try {
    if (dedupKey === undefined) {
      await db.insert(notifications).values({ userId, groupId, type, title, body, url });
      return true;
    }

    const claimed = await db
      .insert(notifications)
      .values({ userId, groupId, type, title, body, url, dedupKey })
      .onConflictDoNothing({ target: notifications.dedupKey })
      .returning({ id: notifications.id });

    return claimed.length > 0;
  } catch (err) {
    console.error("[notifications] insertNotification failed:", err);
    return true;
  }
}

/** Cheap unread-count query for the bell badge. Not `unstable_cache`'d — see
 *  the write-path comment in `lib/notifications/record-notification.ts`. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

/** Paginated feed query for the dropdown/sheet (limit only) and the full
 *  `/notifications` page (limit + offset). */
export async function getNotifications(
  userId: string,
  opts: { limit: number; offset?: number } = { limit: 10 },
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(opts.limit)
    .offset(opts.offset ?? 0);
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
