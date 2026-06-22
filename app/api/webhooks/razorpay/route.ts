import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { razorpayPayments } from "@/lib/db/schema/razorpay-payments";
import { razorpayWebhookEvents } from "@/lib/db/schema/razorpay-webhook-events";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifyWebhookSignature } from "@/lib/razorpay/verify";
import { parseOrderNotes } from "@/lib/razorpay/order-notes";
import { getPassAmountPaise } from "@/lib/razorpay/pass";
import { extendEntitlement } from "@/lib/subscription/entitlement";
import { getEventType, extractCapturedPayment, extractRefundEntity } from "@/lib/razorpay/webhook-logic";
import { getRazorpayMode, getRazorpayWebhookSecret } from "@/lib/razorpay/credentials";
import { recordAdminEvent } from "@/lib/notifications/send-admin-alert";
import { formatCurrency } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — PUBLIC (not in proxy.ts's matcher; /api/* isn't gated).
 * Closed-tab safety net for one-time orders (D9): the verified client
 * callback (`confirmPassPurchase`) grants the pass immediately for good UX;
 * this re-applies the same extension idempotently in case the tab closed
 * before the callback ran. Also the sole source of truth for refunds.
 * See RAZORPAY_PLAN.md §8.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const webhookSecret = getRazorpayWebhookSecret(getRazorpayMode());

  // Verify on the raw body BEFORE parsing — reject 400 on mismatch.
  if (!webhookSecret || !verifyWebhookSignature(raw, signature, webhookSecret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventId = req.headers.get("x-razorpay-event-id");
  const eventType = getEventType(payload);
  if (!eventId || !eventType) {
    return new Response("Missing event id/type", { status: 400 });
  }

  // Atomic dedup claim — INSERT … ON CONFLICT DO NOTHING, never SELECT-then-INSERT
  // (same bug class as the ensureTrialStarted R12-8 fix). Skip processing if this
  // event_id was already recorded (Razorpay retries on non-2xx, or a manual replay).
  const claimedEvent = await db
    .insert(razorpayWebhookEvents)
    .values({ eventId, type: eventType })
    .onConflictDoNothing({ target: razorpayWebhookEvents.eventId })
    .returning({ eventId: razorpayWebhookEvents.eventId });

  if (claimedEvent.length === 0) {
    return new Response("OK", { status: 200 }); // already processed
  }

  try {
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(payload);
        break;
      case "refund.created":
      case "refund.processed":
        await handleRefund(payload);
        break;
      case "payment.failed":
      default:
        // log only — no entitlement action
        break;
    }
  } catch {
    // Already claimed the event_id above, so a retry would no-op on dedup —
    // but Razorpay retries on non-2xx, and we'd rather it retry than silently
    // drop a real failure. Swallow here and return 200 anyway: the event_id
    // claim is for dedup, not a guarantee of success, and there's no safe way
    // to "unclaim" it. Surfacing via logs is the available observability seam.
    console.error(`razorpay webhook: failed processing ${eventType} (${eventId})`);
  }

  // Always 200 fast — Razorpay retries non-2xx.
  return new Response("OK", { status: 200 });
}

/** Backstop for confirmPassPurchase steps 3–4 — no ownership check needed here:
 * the webhook itself is HMAC-authenticated as coming from Razorpay, and `notes`
 * were set server-side at order creation, so there's no "calling user" to spoof. */
async function handlePaymentCaptured(payload: unknown): Promise<void> {
  const payment = extractCapturedPayment(payload);
  if (!payment) return;
  const notes = parseOrderNotes(payment.notes);
  if (!notes) return;

  const claimedPayment = await db
    .insert(razorpayPayments)
    .values({
      userId: notes.userId,
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: getPassAmountPaise(notes.passType, notes.earlyBird),
      passType: notes.passType,
      earlyBird: notes.earlyBird,
      mode: getRazorpayMode(),
    })
    .onConflictDoNothing({ target: razorpayPayments.paymentId })
    .returning({ id: razorpayPayments.id });

  if (claimedPayment.length === 0) return; // already applied by confirmPassPurchase or a prior webhook delivery

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, notes.userId)).limit(1);
  const plusUntil = extendEntitlement(sub?.currentPeriodEnd ?? null, notes.passType, new Date());

  await db
    .insert(subscriptions)
    .values({
      userId: notes.userId,
      plan: "plus",
      status: "active",
      trialEndsAt: null,
      billingCycle: notes.passType,
      currentPeriodEnd: plusUntil,
      lastPaymentId: payment.id,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: "plus",
        status: "active",
        billingCycle: notes.passType,
        currentPeriodEnd: plusUntil,
        lastPaymentId: payment.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/", "layout");

  // This is the backstop path (checkout tab closed before confirmPassPurchase
  // ran) — the atomic claim above (claimedPayment.length === 0 check) means
  // exactly one of this path or confirmPassPurchase's own notify call reaches
  // here per payment, so this never double-fires with the client callback.
  // Buyer name lookup is wrapped separately so a failure here can never
  // affect the entitlement grant above (already committed) — only the
  // notify call's body falls back to "Someone".
  let buyerName = "Someone";
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(notes.userId);
    buyerName = data.user?.user_metadata?.full_name ?? "Someone";
  } catch {
    // name enrichment is best-effort — fall back silently
  }
  await recordAdminEvent({
    type: "purchase",
    userId: notes.userId,
    title: "💰 Purchase",
    body: `${buyerName} · ${formatCurrency(getPassAmountPaise(notes.passType, notes.earlyBird) / 100, "INR")} · ${notes.passType === "annual" ? "Annual pass" : "30-day pass"}${notes.earlyBird ? " (Early Bird)" : ""}`,
    url: "/admin",
  });
}

/**
 * v1 simplification (RAZORPAY_PLAN.md §4): clear the entitlement, don't
 * day-math a partial refund.
 *
 * Called unconditionally for BOTH `refund.created` and `refund.processed` —
 * these are distinct event_ids for the same refund, so the route's own
 * event_id dedup ledger does NOT collapse them. The admin-activity dedup key
 * (`refund:${refundEntity.id}`) is what makes the notify exactly-once here,
 * independent of which event type arrives, or arrives first — webhook
 * delivery order is never guaranteed.
 */
async function handleRefund(payload: unknown): Promise<void> {
  const refundEntity = extractRefundEntity(payload);
  if (!refundEntity) return;

  const [paymentRow] = await db
    .select({ userId: razorpayPayments.userId })
    .from(razorpayPayments)
    .where(eq(razorpayPayments.paymentId, refundEntity.paymentId))
    .limit(1);
  if (!paymentRow) return; // refund for a payment we never recorded — nothing to clear

  await db
    .update(subscriptions)
    .set({ currentPeriodEnd: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.userId, paymentRow.userId));

  revalidatePath("/", "layout");

  let buyerName = "Someone";
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(paymentRow.userId);
    buyerName = data.user?.user_metadata?.full_name ?? "Someone";
  } catch {
    // name enrichment is best-effort — fall back silently
  }
  await recordAdminEvent({
    type: "refund",
    userId: paymentRow.userId,
    title: "↩️ Refund",
    body: `${buyerName} · entitlement cleared`,
    url: "/admin",
    dedupKey: `refund:${refundEntity.id}`,
  });
}
