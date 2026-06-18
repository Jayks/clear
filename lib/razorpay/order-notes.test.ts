import { describe, it, expect } from "vitest";
import { buildOrderNotes, parseOrderNotes, isOwnedBy, buildReceiptId } from "./order-notes";

describe("buildOrderNotes / parseOrderNotes round-trip", () => {
  it("round-trips a pass_30d, non-early-bird order", () => {
    const notes = buildOrderNotes({ userId: "u-123", passType: "pass_30d", earlyBird: false });
    expect(parseOrderNotes(notes)).toEqual({ userId: "u-123", passType: "pass_30d", earlyBird: false });
  });

  it("round-trips an annual, early-bird order", () => {
    const notes = buildOrderNotes({ userId: "u-456", passType: "annual", earlyBird: true });
    expect(parseOrderNotes(notes)).toEqual({ userId: "u-456", passType: "annual", earlyBird: true });
  });
});

describe("parseOrderNotes — defends confirmPassPurchase/webhook against a malformed/foreign order", () => {
  it("rejects null/undefined notes (order created by something else, or fetch failed)", () => {
    expect(parseOrderNotes(null)).toBeNull();
    expect(parseOrderNotes(undefined)).toBeNull();
  });

  it("rejects notes missing userId", () => {
    expect(parseOrderNotes({ passType: "pass_30d", earlyBird: "false" })).toBeNull();
  });

  it("rejects an unknown passType (not in PASS_DURATION_DAYS)", () => {
    expect(parseOrderNotes({ userId: "u-1", passType: "lifetime", earlyBird: "false" })).toBeNull();
  });

  it("rejects a non-string userId", () => {
    expect(parseOrderNotes({ userId: 123, passType: "pass_30d", earlyBird: "false" })).toBeNull();
  });

  it("coerces the stringified earlyBird booleans Razorpay's notes API returns", () => {
    // Razorpay's notes values are always strings round-tripped through their API.
    expect(parseOrderNotes({ userId: "u-1", passType: "pass_30d", earlyBird: "true" })).toEqual({
      userId: "u-1",
      passType: "pass_30d",
      earlyBird: true,
    });
    expect(parseOrderNotes({ userId: "u-1", passType: "pass_30d", earlyBird: "false" })).toEqual({
      userId: "u-1",
      passType: "pass_30d",
      earlyBird: false,
    });
  });
});

describe("isOwnedBy — the D10 ownership check", () => {
  it("true when the order's notes.userId matches the calling user", () => {
    const notes = { userId: "u-1", passType: "pass_30d" as const, earlyBird: false };
    expect(isOwnedBy(notes, "u-1")).toBe(true);
  });

  it("false when notes.userId belongs to a different user (replay of a leaked triplet)", () => {
    const notes = { userId: "u-1", passType: "pass_30d" as const, earlyBird: false };
    expect(isOwnedBy(notes, "u-2")).toBe(false);
  });

  it("false when notes failed to parse (null)", () => {
    expect(isOwnedBy(null, "u-1")).toBe(false);
  });
});

describe("buildReceiptId", () => {
  it("stays within Razorpay's 40-char receipt limit even for a long userId/timestamp", () => {
    const id = buildReceiptId("11111111-2222-3333-4444-555555555555", 9999999999999);
    expect(id.length).toBeLessThanOrEqual(40);
  });

  it("is deterministic for the same inputs", () => {
    expect(buildReceiptId("u-1", 1000)).toBe(buildReceiptId("u-1", 1000));
  });

  it("differs across users so receipts don't collide", () => {
    expect(buildReceiptId("u-1", 1000)).not.toBe(buildReceiptId("u-2", 1000));
  });
});
