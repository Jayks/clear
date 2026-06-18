"use server";

import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema/subscriptions";
import { razorpayPayments } from "@/lib/db/schema/razorpay-payments";
import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/db/queries/auth";
import { revalidatePath } from "next/cache";
import { getEarlyBirdSlotsClaimed, isEarlyBirdActive } from "@/lib/subscription/early-bird";
import { extendEntitlement, type PassType } from "@/lib/subscription/entitlement";
import { createOrder, fetchOrder } from "@/lib/razorpay/client";
import { getPassAmountPaise } from "@/lib/razorpay/pass";
import { buildOrderNotes, parseOrderNotes, isOwnedBy, buildReceiptId } from "@/lib/razorpay/order-notes";
import { verifyCheckoutSignature } from "@/lib/razorpay/verify";

// Called fire-and-forget from app/(app)/layout.tsx on every authenticated page load.
// Creates the subscription row (trialing) on first visit, regardless of entry point.
export async function ensureTrialStarted(): Promise<void> {
  // Derive the user from the validated session — never trust a client-supplied
  // userId (this is an exported server action; an arbitrary caller must not be
  // able to seed a trial row for someone else's account).
  const user = await getCurrentUser();
  if (!user) return;

  // R12-8 fix: replaced SELECT-then-INSERT with a single atomic INSERT …
  // ON CONFLICT DO NOTHING. The old pattern had a race window where two
  // concurrent first-page-loads both saw no row and both attempted INSERT;
  // one silently failed with a unique-constraint violation.  onConflictDoNothing
  // is a single round-trip and is inherently safe under any concurrency.
  try {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    await db.insert(subscriptions).values({
      userId: user.id,
      plan: "free",
      status: "trialing",
      trialEndsAt,
    }).onConflictDoNothing();
    // trial_started GA4 event is client-side — fired by TrialBanner in Phase 3
  } catch {
    // Table may not exist yet — fail silently, will retry on next page load
  }
}

// ── Real Razorpay pass purchase (M2/M3 — RAZORPAY_PLAN.md §7) ────────────────
// Replaces the old activatePlusDemo/cancelPlusDemo simulated stubs, removed
// once checkout-form.tsx and billing-section.tsx were swapped over to these.

/**
 * Step 1 of the purchase flow: create a Razorpay Order for the chosen pass.
 * Early-bird eligibility is re-checked server-side — the client can't claim
 * ₹49 pricing after the 300 slots fill by replaying a stale prop.
 *
 * "Locked in forever" fix: the slot counter (`getEarlyBirdSlotsClaimed`) is a
 * live count of *currently* active subscriptions, re-checked on every order —
 * by itself that only protects a user's FIRST purchase. Once the counter
 * crosses 300 (which it inevitably does once the promotion succeeds), a
 * repeat/renewal purchase from an original early-bird subscriber would
 * silently re-price at the regular rate, breaking the explicit "your price
 * never increases" promise (see /pricing FAQ + RAZORPAY_PLAN.md D-early-bird).
 * Fix: anyone who has EVER completed an early-bird payment keeps early-bird
 * pricing on every future purchase, independent of the live slot count.
 */
export async function createPassOrder(
  passType: PassType
): Promise<{ ok: true; orderId: string; amount: number; keyId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) return { ok: false, error: "Payments are not configured yet" };

  const [priorEarlyBirdPayment, claimed] = await Promise.all([
    db
      .select({ id: razorpayPayments.id })
      .from(razorpayPayments)
      .where(and(eq(razorpayPayments.userId, user.id), eq(razorpayPayments.earlyBird, true)))
      .limit(1),
    getEarlyBirdSlotsClaimed(),
  ]);
  const earlyBird = priorEarlyBirdPayment.length > 0 || isEarlyBirdActive(claimed);
  const amountPaise = getPassAmountPaise(passType, earlyBird);
  const notes = buildOrderNotes({ userId: user.id, passType, earlyBird });
  const receipt = buildReceiptId(user.id, Date.now());

  try {
    const order = await createOrder({ amountPaise, receipt, notes });
    return { ok: true, orderId: order.id, amount: order.amount, keyId };
  } catch {
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}

/**
 * Step 2: verify the client callback and extend the entitlement.
 *
 * Security, in order:
 * 1. HMAC-verify the checkout signature (authoritative for one-time orders, D9).
 * 2. Re-fetch the order and assert `notes.userId === currentUser.id` (D10) —
 *    a leaked/shared orderId+paymentId+signature triplet must not be
 *    replayable by a different logged-in user.
 * 3. Atomically claim `paymentId` in `razorpay_payments`
 *    (`INSERT … ON CONFLICT DO NOTHING`) — only extend the entitlement if
 *    this call actually claimed it; otherwise the webhook backstop (or a
 *    prior call) already applied it, so this is a no-op success.
 */
export async function confirmPassPurchase(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<{ ok: true; plusUntil: Date } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return { ok: false, error: "Payments are not configured yet" };

  if (!verifyCheckoutSignature(orderId, paymentId, signature, keySecret)) {
    return { ok: false, error: "Payment verification failed" };
  }

  let order;
  try {
    order = await fetchOrder(orderId);
  } catch {
    return { ok: false, error: "Could not verify payment with Razorpay" };
  }

  const notes = parseOrderNotes(order.notes);
  if (!notes || !isOwnedBy(notes, user.id)) {
    return { ok: false, error: "This payment does not belong to your account" };
  }
  const { passType, earlyBird } = notes;

  const claimed = await db
    .insert(razorpayPayments)
    .values({
      userId: user.id,
      paymentId,
      orderId,
      amount: getPassAmountPaise(passType, earlyBird),
      passType,
      earlyBird,
    })
    .onConflictDoNothing({ target: razorpayPayments.paymentId })
    .returning({ id: razorpayPayments.id });

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);

  if (claimed.length === 0) {
    // Already applied — by the webhook backstop or a prior call. No-op success.
    return { ok: true, plusUntil: sub?.currentPeriodEnd ?? new Date() };
  }

  const plusUntil = extendEntitlement(sub?.currentPeriodEnd ?? null, passType, new Date());
  await db
    .insert(subscriptions)
    .values({
      userId: user.id,
      plan: "plus",
      status: "active",
      trialEndsAt: null,
      billingCycle: passType,
      currentPeriodEnd: plusUntil,
      lastPaymentId: paymentId,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: "plus",
        status: "active",
        billingCycle: passType,
        currentPeriodEnd: plusUntil,
        lastPaymentId: paymentId,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/", "layout");
  return { ok: true, plusUntil };
}
