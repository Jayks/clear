import { insertNotification } from "@/lib/db/queries/notifications";
import type { NotificationType } from "@/lib/db/schema/notifications";

/**
 * Orchestrator that every notification-producing call site uses instead of
 * calling `sendPushToUser`/`sendStreamPush`/`sendPushToUserId` directly —
 * persists the event to the `notifications` inbox first, then push-notifies
 * only if that persist actually "won" (always true except a genuine
 * `dedupKey` conflict, e.g. the trip-wrap-up lazy check-on-visit).
 *
 * Deliberately does NOT own the push transport itself — call sites differ
 * (group-scoped `sendPushToUser` with a mute check, Stream's ungated
 * `sendStreamPush`, admin's generic `sendPushToUserId`), so `sendPush` is
 * passed in as a closure over whichever existing push call the site already
 * had. This makes the swap at each call site mechanical: wrap the existing
 * `sendXPush(...)` call in a `sendPush` closure, keep everything else
 * unchanged. Mirrors `recordAdminEvent` (`lib/notifications/send-admin-alert.ts`)
 * — same persist-then-notify shape, same "never throws" posture (the push
 * closure is expected to internally `.catch(() => {})` same as today).
 */
export async function recordNotification(params: {
  userId:   string;
  groupId?: string;
  type:     NotificationType;
  title:    string;
  body:     string;
  url:      string;
  dedupKey?: string;
  sendPush: () => Promise<void>;
}): Promise<void> {
  const { userId, groupId, type, title, body, url, dedupKey, sendPush } = params;
  const shouldPush = await insertNotification({ userId, groupId, type, title, body, url, dedupKey });
  if (shouldPush) await sendPush();
}

/**
 * Fan-out wrapper for the multi-recipient case — every group member except
 * the actor needs their own inbox row for one event (first, and still only,
 * user: `expense_added` in `app/actions/expenses.ts`, added 2026-07-03,
 * replacing the old push-only `sendPushToMembers`). Calls `recordNotification`
 * once per recipient rather than one bulk push, since each recipient needs
 * their own inbox row.
 */
export async function recordNotificationToMembers(
  recipientUserIds: string[],
  build: (userId: string) => Omit<Parameters<typeof recordNotification>[0], "userId">,
): Promise<void> {
  await Promise.all(
    recipientUserIds.map((userId) => recordNotification({ userId, ...build(userId) }))
  );
}
