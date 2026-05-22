import type webpushType from "web-push";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema/push-subscriptions";
import { groupMembers } from "@/lib/db/schema/group-members";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { groups } from "@/lib/db/schema/groups";

interface PushParams {
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  actorName: string;
  actorUserId: string;
}

export async function sendPushToMembers(params: PushParams): Promise<void> {
  const { groupId, description, amount, currency, actorName, actorUserId } = params;

  const webpush = ((await import("web-push")) as unknown as { default: typeof webpushType }).default;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const [group] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId));
  if (!group) return;

  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        isNotNull(groupMembers.userId),
        eq(groupMembers.notificationsMuted, false)
      )
    );

  const userIds = members
    .map((m) => m.userId!)
    .filter((id) => id !== actorUserId);

  if (userIds.length === 0) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));

  if (subs.length === 0) return;

  const payload = JSON.stringify({
    title: group.name,
    body: `${actorName} logged ${formatCurrency(amount, currency)} for ${description}`,
    url: `/groups/${groupId}`,
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err: unknown) {
        // 410 Gone = subscription expired, clean it up
        if (typeof err === "object" && err !== null && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      }
    })
  );
}
