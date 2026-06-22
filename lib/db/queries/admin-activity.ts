import { db } from "@/lib/db/client";
import { adminActivity } from "@/lib/db/schema/admin-activity";
import type { AdminActivityType } from "@/lib/db/schema/admin-activity";

/**
 * Write primitive for the persisted admin activity feed. Called by trusted
 * server code (server actions / the Razorpay webhook), never gated by
 * `requirePlatformAdmin` — it's never invoked from a page request, only from
 * event-producing call sites (trackVisit, confirmPassPurchase, the webhook).
 *
 * Returns `true` when the caller should go ahead and push-notify, `false`
 * only on a genuine dedup conflict (a `dedupKey` that already exists — the
 * refund.created/refund.processed double-fire case). No `dedupKey` given
 * (login/signup/purchase) always inserts and always returns `true`.
 *
 * Never throws — an unexpected DB error logs loud and still returns `true`.
 * Silence is the worse failure mode here (this table exists specifically to
 * stop misses going unnoticed), so an unknown claim status defaults to
 * notifying rather than risking a swallowed miss.
 */
export async function recordAdminActivity(params: {
  type: AdminActivityType;
  userId: string;
  title: string;
  body: string;
  dedupKey?: string;
}): Promise<boolean> {
  const { type, userId, title, body, dedupKey } = params;
  try {
    if (dedupKey === undefined) {
      await db.insert(adminActivity).values({ type, userId, title, body });
      return true;
    }

    const claimed = await db
      .insert(adminActivity)
      .values({ type, userId, title, body, dedupKey })
      .onConflictDoNothing({ target: adminActivity.dedupKey })
      .returning({ id: adminActivity.id });

    return claimed.length > 0;
  } catch (err) {
    console.error("[admin-activity] recordAdminActivity failed:", err);
    return true;
  }
}
