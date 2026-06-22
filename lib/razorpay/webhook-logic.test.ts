import { describe, it, expect } from "vitest";
import { extractCapturedPayment, extractRefundEntity, getEventType } from "./webhook-logic";

describe("getEventType", () => {
  it("reads the event discriminator from a well-formed payload", () => {
    expect(getEventType({ event: "payment.captured" })).toBe("payment.captured");
  });

  it("returns null for non-object payloads", () => {
    expect(getEventType(null)).toBeNull();
    expect(getEventType(undefined)).toBeNull();
    expect(getEventType("payment.captured")).toBeNull();
    expect(getEventType(42)).toBeNull();
  });

  it("returns null when event is missing or not a string", () => {
    expect(getEventType({})).toBeNull();
    expect(getEventType({ event: 123 })).toBeNull();
  });
});

describe("extractCapturedPayment", () => {
  const VALID_PAYLOAD = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_29QQoUBi66xm2f",
          order_id: "order_DBJOWzybf0sJbb",
          notes: { userId: "u-1", passType: "pass_30d", earlyBird: "false" },
        },
      },
    },
  };

  it("extracts id/orderId/notes from a well-formed payment.captured payload", () => {
    expect(extractCapturedPayment(VALID_PAYLOAD)).toEqual({
      id: "pay_29QQoUBi66xm2f",
      orderId: "order_DBJOWzybf0sJbb",
      notes: { userId: "u-1", passType: "pass_30d", earlyBird: "false" },
    });
  });

  it("returns null for a non-object payload", () => {
    expect(extractCapturedPayment(null)).toBeNull();
    expect(extractCapturedPayment("garbage")).toBeNull();
  });

  it("returns null when payload.payload is missing", () => {
    expect(extractCapturedPayment({ event: "payment.captured" })).toBeNull();
  });

  it("returns null when payload.payload.payment is missing (e.g. a refund event shape)", () => {
    expect(extractCapturedPayment({ event: "payment.captured", payload: {} })).toBeNull();
  });

  it("returns null when payment.entity is missing", () => {
    expect(extractCapturedPayment({ event: "payment.captured", payload: { payment: {} } })).toBeNull();
  });

  it("returns null when entity.id is missing or not a string", () => {
    expect(
      extractCapturedPayment({
        event: "payment.captured",
        payload: { payment: { entity: { order_id: "order_1" } } },
      }),
    ).toBeNull();
  });

  it("returns null when entity.order_id is missing or not a string", () => {
    expect(
      extractCapturedPayment({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_1" } } },
      }),
    ).toBeNull();
  });

  it("passes through notes as-is (even if absent) for parseOrderNotes to validate downstream", () => {
    const result = extractCapturedPayment({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
    });
    expect(result).toEqual({ id: "pay_1", orderId: "order_1", notes: undefined });
  });
});

describe("extractRefundEntity", () => {
  it("extracts id + payment_id from a well-formed refund payload", () => {
    const payload = {
      event: "refund.processed",
      payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_29QQoUBi66xm2f" } } },
    };
    expect(extractRefundEntity(payload)).toEqual({ id: "rfnd_1", paymentId: "pay_29QQoUBi66xm2f" });
  });

  it("returns null for a non-object payload", () => {
    expect(extractRefundEntity(null)).toBeNull();
  });

  it("returns null when payload.refund is missing", () => {
    expect(extractRefundEntity({ event: "refund.processed", payload: {} })).toBeNull();
  });

  it("returns null when refund.entity.payment_id is missing or not a string", () => {
    expect(
      extractRefundEntity({ event: "refund.processed", payload: { refund: { entity: { id: "rfnd_1" } } } }),
    ).toBeNull();
  });

  it("returns null when refund.entity.id is missing or not a string", () => {
    expect(
      extractRefundEntity({
        event: "refund.processed",
        payload: { refund: { entity: { payment_id: "pay_1" } } },
      }),
    ).toBeNull();
  });
});
