/**
 * Pure parsing of Razorpay webhook JSON payload shapes — split out so the
 * route handler (DB + HTTP) stays a thin caller and this stays directly
 * unit-testable (vitest can't resolve the `@/` alias — see degradation.ts).
 * See RAZORPAY_PLAN.md §8.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** The event-type discriminator at the top of every webhook payload. */
export function getEventType(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const event = payload.event;
  return typeof event === "string" ? event : null;
}

export interface CapturedPaymentEntity {
  id: string;
  orderId: string;
  /** Unvalidated — pass to `parseOrderNotes` for the actual shape check. */
  notes: unknown;
}

/** `payment.captured` events nest the payment entity under payload.payment.entity. */
export function extractCapturedPayment(payload: unknown): CapturedPaymentEntity | null {
  if (!isRecord(payload)) return null;
  const payloadField = payload.payload;
  if (!isRecord(payloadField)) return null;
  const payment = payloadField.payment;
  if (!isRecord(payment)) return null;
  const entity = payment.entity;
  if (!isRecord(entity)) return null;
  const { id, order_id: orderId, notes } = entity;
  if (typeof id !== "string" || typeof orderId !== "string") return null;
  return { id, orderId, notes };
}

export interface RefundEntity {
  /** The refund's own stable id (e.g. `re_xxx`) — used as the dedup key
   * across `refund.created`/`refund.processed`, since those are two distinct
   * events (different `event_id`s) for the same refund and webhook delivery
   * order is never guaranteed. */
  id: string;
  paymentId: string;
}

/** `refund.created`/`refund.processed` events nest the refund entity under payload.refund.entity. */
export function extractRefundEntity(payload: unknown): RefundEntity | null {
  if (!isRecord(payload)) return null;
  const payloadField = payload.payload;
  if (!isRecord(payloadField)) return null;
  const refund = payloadField.refund;
  if (!isRecord(refund)) return null;
  const entity = refund.entity;
  if (!isRecord(entity)) return null;
  const { id, payment_id: paymentId } = entity;
  if (typeof id !== "string" || typeof paymentId !== "string") return null;
  return { id, paymentId };
}
