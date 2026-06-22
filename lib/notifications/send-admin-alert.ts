import { getPlatformAdminUserIds } from "@/lib/db/queries/admin";
import { sendPushToUserId } from "@/lib/notifications/send-push-notification";
import { recordAdminActivity } from "@/lib/db/queries/admin-activity";
import type { AdminActivityType } from "@/lib/db/schema/admin-activity";

/**
 * Notifies every platform admin (PLATFORM_ADMIN_EMAIL, comma-separated) on
 * every device they've subscribed push notifications from. Replaces the old
 * Telegram alert path (api.telegram.org now blocked from India) for both
 * login pings (trackVisit) and purchase pings (confirmPassPurchase / the
 * Razorpay webhook backstop).
 *
 * Never throws — callers can `await notifyAdmins(...)` directly with no
 * `.catch()` needed, same fire-and-forget posture as the Telegram call it
 * replaces.
 *
 * Logs three independent failure modes distinctly, so a future "why didn't I
 * get pinged" investigation has somewhere to look in server logs — the old
 * Telegram path had none of this, which is how its breakage went unnoticed:
 *   1. No platform admin user IDs resolved (env var / Admin API issue)
 *   2. A resolved admin's send rejected outright (VAPID misconfig, DB down —
 *      failures that occur before sendPushToUserId's own per-subscription
 *      try/catch, so they escape that function entirely)
 *   3. Admins resolved and no rejections, but zero subscriptions existed
 *      anywhere (nobody has turned on push notifications yet)
 *
 * This is the single seam for adding a second channel (e.g. Resend email)
 * later — that would be one more branch inside this function, not a change
 * to either call site.
 *
 * Stays the push-only primitive — event-producing call sites (trackVisit,
 * confirmPassPurchase, the webhook) should call `recordAdminEvent` below
 * instead, which persists to `admin_activity` before deciding whether to
 * notify.
 */
export async function notifyAdmins(title: string, body: string, url: string): Promise<void> {
  try {
    const adminIds = await getPlatformAdminUserIds();
    if (adminIds.length === 0) {
      console.error("[admin-alert] no platform admin user IDs resolved");
      return;
    }

    const results = await Promise.allSettled(
      adminIds.map((id) => sendPushToUserId(id, { title, body, url }))
    );

    let totalSubs = 0;
    for (const result of results) {
      if (result.status === "fulfilled") {
        totalSubs += result.value;
      } else {
        console.error("[admin-alert] push send rejected for an admin:", result.reason);
      }
    }

    if (totalSubs === 0) {
      console.error("[admin-alert] no push subscriptions registered for any platform admin");
    }
  } catch (err) {
    console.error("[admin-alert] notifyAdmins failed:", err);
  }
}

/**
 * Orchestrator that call sites use instead of `notifyAdmins` directly —
 * persists the event to `admin_activity` first, then notifies only if that
 * persist actually "won" (always true except the refund dedup case below).
 *
 * Persistence is awaited BEFORE deciding whether to push (not a blind
 * `Promise.allSettled` of two independent calls) — required so a genuine
 * dedup conflict (Razorpay's `refund.created`/`refund.processed` firing
 * twice for one refund) can suppress the push, not just the row. Small
 * latency cost (one INSERT before the push starts) for every event type,
 * accepted for one simple, uniformly-correct code path rather than a
 * parallel-fast-path/sequential-dedup-path split.
 */
export async function recordAdminEvent(params: {
  type: AdminActivityType;
  userId: string;
  title: string;
  body: string;
  url: string;
  dedupKey?: string;
}): Promise<void> {
  const { type, userId, title, body, url, dedupKey } = params;
  const shouldNotify = await recordAdminActivity({ type, userId, title, body, dedupKey });
  if (shouldNotify) await notifyAdmins(title, body, url);
}
