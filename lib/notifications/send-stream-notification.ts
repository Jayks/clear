import type webpushType from "web-push";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema/push-subscriptions";
import { eq } from "drizzle-orm";

/**
 * Send a web-push notification to a specific user for a Stream event.
 *
 * Unlike sendPushToMembers (group-based with notifications_muted check),
 * Stream notifications are user-to-user with no group context.
 * No notifications_muted check — Stream is opt-in by the nature of the relationship.
 */
export async function sendStreamPush(
  targetUserId: string,
  payload: {
    title: string;
    body: string;
    /** Deep-link URL opened when the notification is tapped. */
    url: string;
  },
): Promise<void> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, targetUserId));

  if (subs.length === 0) return;

  const webpush = (
    (await import("web-push")) as unknown as { default: typeof webpushType }
  ).default;

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const message = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
        );
      } catch (err: unknown) {
        // 410 Gone = subscription expired — clean it up silently
        if (
          typeof err === "object" &&
          err !== null &&
          "statusCode" in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }),
  );
}
