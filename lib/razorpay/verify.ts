/**
 * Razorpay signature verification — pure, no DB/network. See RAZORPAY_PLAN.md §6.
 *
 * Both checkout-callback and webhook payloads are HMAC-SHA256 hex digests.
 * Secrets are passed in (never read from `process.env` here) so this stays
 * unit-testable without environment setup.
 */

import crypto from "crypto";

/**
 * Verifies the signature Razorpay Checkout returns to the client after a
 * successful payment: HMAC-SHA256(`${orderId}|${paymentId}`, keySecret).
 * This is the authoritative check for one-time orders (D9).
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return timingSafeHexEqual(expected, signature);
}

/**
 * Verifies a Razorpay webhook's `x-razorpay-signature` header against the
 * exact raw request body: HMAC-SHA256(rawBody, webhookSecret). Must be called
 * on the untouched raw body — re-serializing parsed JSON can drift from what
 * was actually signed.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): boolean {
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return timingSafeHexEqual(expected, signature);
}

/**
 * `crypto.timingSafeEqual` throws on a length mismatch rather than returning
 * false, which would turn a malformed/missing signature into a 500 instead
 * of a clean rejection. Guard the length first, compare in constant time after.
 */
function timingSafeHexEqual(expectedHex: string, providedHex: string): boolean {
  const a = Buffer.from(expectedHex, "utf8");
  const b = Buffer.from(providedHex ?? "", "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
