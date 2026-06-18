import { describe, it, expect } from "vitest";
import { verifyCheckoutSignature, verifyWebhookSignature } from "./verify";

// Vectors precomputed independently via Node's crypto (not by importing the
// implementation under test) — see the shell one-liner in the M2 session.
// keySecret="test_secret_key", orderId="order_DBJOWzybf0sJbb", paymentId="pay_29QQoUBi66xm2f"
const KEY_SECRET = "test_secret_key";
const ORDER_ID = "order_DBJOWzybf0sJbb";
const PAYMENT_ID = "pay_29QQoUBi66xm2f";
const VALID_CHECKOUT_SIG = "b2410ac2ea2562e609cf000324e25b65a38db36a8767c0743ea4f3355fd8f710".slice(0, 64);

const WEBHOOK_SECRET = "whsec_test_secret_abc123";
const RAW_BODY = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_29QQoUBi66xm2f","notes":{"userId":"u1","passType":"pass_30d","earlyBird":false}}}}}';
const VALID_WEBHOOK_SIG = "897261675b7342bfc1d70eae975e14838bc60262102d65edc8bfed506496202b".slice(0, 64);

describe("verifyCheckoutSignature", () => {
  it("accepts a correctly computed signature", () => {
    expect(verifyCheckoutSignature(ORDER_ID, PAYMENT_ID, VALID_CHECKOUT_SIG, KEY_SECRET)).toBe(true);
  });

  it("rejects a tampered signature (last char flipped)", () => {
    const tampered = VALID_CHECKOUT_SIG.slice(0, -1) + (VALID_CHECKOUT_SIG.endsWith("0") ? "1" : "0");
    expect(verifyCheckoutSignature(ORDER_ID, PAYMENT_ID, tampered, KEY_SECRET)).toBe(false);
  });

  it("rejects when the order id doesn't match what was signed", () => {
    expect(verifyCheckoutSignature("order_OTHER", PAYMENT_ID, VALID_CHECKOUT_SIG, KEY_SECRET)).toBe(false);
  });

  it("rejects when the payment id doesn't match what was signed", () => {
    expect(verifyCheckoutSignature(ORDER_ID, "pay_OTHER", VALID_CHECKOUT_SIG, KEY_SECRET)).toBe(false);
  });

  it("rejects when verified against the wrong key secret", () => {
    expect(verifyCheckoutSignature(ORDER_ID, PAYMENT_ID, VALID_CHECKOUT_SIG, "wrong_secret")).toBe(false);
  });

  it("rejects an empty signature without throwing", () => {
    expect(verifyCheckoutSignature(ORDER_ID, PAYMENT_ID, "", KEY_SECRET)).toBe(false);
  });

  it("rejects a signature of a different length without throwing (timingSafeEqual length guard)", () => {
    expect(verifyCheckoutSignature(ORDER_ID, PAYMENT_ID, "abcd", KEY_SECRET)).toBe(false);
  });

  it("rejects a same-length but non-hex garbage signature without throwing", () => {
    const garbage = "g".repeat(VALID_CHECKOUT_SIG.length);
    expect(verifyCheckoutSignature(ORDER_ID, PAYMENT_ID, garbage, KEY_SECRET)).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts a correctly computed signature over the raw body", () => {
    expect(verifyWebhookSignature(RAW_BODY, VALID_WEBHOOK_SIG, WEBHOOK_SECRET)).toBe(true);
  });

  it("rejects when the raw body was mutated after signing (body-sensitive, not just length-sensitive)", () => {
    const mutated = RAW_BODY.replace("payment.captured", "payment.failed");
    expect(verifyWebhookSignature(mutated, VALID_WEBHOOK_SIG, WEBHOOK_SECRET)).toBe(false);
  });

  it("rejects when verified against the wrong webhook secret", () => {
    expect(verifyWebhookSignature(RAW_BODY, VALID_WEBHOOK_SIG, "wrong_webhook_secret")).toBe(false);
  });

  it("rejects a missing/empty signature header without throwing", () => {
    expect(verifyWebhookSignature(RAW_BODY, "", WEBHOOK_SECRET)).toBe(false);
  });

  it("rejects a malformed signature without throwing", () => {
    expect(verifyWebhookSignature(RAW_BODY, "not-a-real-signature", WEBHOOK_SECRET)).toBe(false);
  });
});
