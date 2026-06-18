import { describe, it, expect } from "vitest";
import { deriveRequestState } from "../../payment-requests/request-state";
import type { PaymentRequest } from "../schema/payment-requests";

// ── Token UUID validation ─────────────────────────────────────────────────────
// The same regex is used in app/request/[token]/page.tsx to avoid DB round-trips
// on obviously invalid tokens (mirrors stream/confirm/[token]/page.tsx).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("UUID_RE (token format guard)", () => {
  it("accepts a valid lowercase UUID", () => {
    expect(UUID_RE.test("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(true);
  });

  it("accepts a valid uppercase UUID", () => {
    expect(UUID_RE.test("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")).toBe(true);
  });

  it("rejects a string with wrong segment lengths", () => {
    expect(UUID_RE.test("a1b2c3d4-e5f6-7890-abcd-ef123456789")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(UUID_RE.test("")).toBe(false);
  });

  it("rejects a plain slug (no hyphens)", () => {
    expect(UUID_RE.test("a1b2c3d4e5f67890abcdef1234567890")).toBe(false);
  });

  it("rejects path-traversal attempts", () => {
    expect(UUID_RE.test("../../etc/passwd")).toBe(false);
  });
});

// ── deriveRequestState ────────────────────────────────────────────────────────
// Tests the pure flag-derivation logic in isolation — no DB needed.

/** Minimal stub: only the fields deriveRequestState reads */
function makeRow(
  status: PaymentRequest["status"],
  expiresAt: Date,
): PaymentRequest {
  return {
    id:               "00000000-0000-0000-0000-000000000001",
    token:            "00000000-0000-0000-0000-000000000002",
    contextType:      "trip",
    groupId:          "00000000-0000-0000-0000-000000000003",
    groupName:        "Test group",
    amount:           "1200.00",
    currency:         "INR",
    description:      null,
    payerName:        "Ravi",
    payerMemberId:    null,
    payeeUserId:      "00000000-0000-0000-0000-000000000004",
    payeeMemberId:    null,
    payeeName:        "Arjun",
    payeeUpiId:       null,
    circlePeriod:     null,
    status,
    paymentMethod:    null,
    utrReference:     null,
    settlementId:     null,
    contributionId:   null,
    createdByUserId:  "00000000-0000-0000-0000-000000000005",
    createdAt:        new Date("2026-06-01T00:00:00Z"),
    expiresAt,
    selfReportedAt:   null,
    confirmedAt:      null,
  };
}

const FUTURE  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
const PAST    = new Date(Date.now() - 1 * 1000);                  // 1 second ago

describe("deriveRequestState", () => {
  describe("isExpired", () => {
    it("is false when expiresAt is in the future", () => {
      const { isExpired } = deriveRequestState(makeRow("pending", FUTURE));
      expect(isExpired).toBe(false);
    });

    it("is true when expiresAt is in the past", () => {
      const { isExpired } = deriveRequestState(makeRow("pending", PAST));
      expect(isExpired).toBe(true);
    });

    it("is true even when status is self_reported (expiry only gates new reports)", () => {
      // Once self-reported, isExpired=true is fine — the page won't show the form
      // for a self_reported row anyway (isSelfReported takes precedence in the RSC).
      const { isExpired } = deriveRequestState(makeRow("self_reported", PAST));
      expect(isExpired).toBe(true);
    });
  });

  describe("isResolved", () => {
    it("is true for confirmed status", () => {
      const { isResolved } = deriveRequestState(makeRow("confirmed", FUTURE));
      expect(isResolved).toBe(true);
    });

    it("is true for disputed status", () => {
      const { isResolved } = deriveRequestState(makeRow("disputed", FUTURE));
      expect(isResolved).toBe(true);
    });

    it("is false for pending status", () => {
      const { isResolved } = deriveRequestState(makeRow("pending", FUTURE));
      expect(isResolved).toBe(false);
    });

    it("is false for self_reported status", () => {
      const { isResolved } = deriveRequestState(makeRow("self_reported", FUTURE));
      expect(isResolved).toBe(false);
    });

    it("is false for confirming status", () => {
      const { isResolved } = deriveRequestState(makeRow("confirming", FUTURE));
      expect(isResolved).toBe(false);
    });
  });

  describe("isSelfReported", () => {
    it("is true for self_reported status", () => {
      const { isSelfReported } = deriveRequestState(makeRow("self_reported", FUTURE));
      expect(isSelfReported).toBe(true);
    });

    it("is true for confirming status (transient admin claim — must show waiting, not form)", () => {
      // 'confirming' is held for a sub-second window while confirmExternalPayment
      // writes the financial row. A guest who loads mid-window must not see the
      // active payment form — they should see the "waiting for admin" state.
      const { isSelfReported } = deriveRequestState(makeRow("confirming", FUTURE));
      expect(isSelfReported).toBe(true);
    });

    it("is false for pending status", () => {
      const { isSelfReported } = deriveRequestState(makeRow("pending", FUTURE));
      expect(isSelfReported).toBe(false);
    });

    it("is false for confirmed status", () => {
      const { isSelfReported } = deriveRequestState(makeRow("confirmed", FUTURE));
      expect(isSelfReported).toBe(false);
    });
  });

  describe("active state (no flags set)", () => {
    it("pending + not expired → all flags false (shows payment form)", () => {
      const state = deriveRequestState(makeRow("pending", FUTURE));
      expect(state.isExpired).toBe(false);
      expect(state.isResolved).toBe(false);
      expect(state.isSelfReported).toBe(false);
    });
  });

  describe("'now' parameter", () => {
    it("accepts a custom 'now' for deterministic time testing", () => {
      const expiresAt = new Date("2026-06-18T12:00:00Z");
      const before    = new Date("2026-06-18T11:59:59Z");
      const after     = new Date("2026-06-18T12:00:01Z");

      expect(deriveRequestState(makeRow("pending", expiresAt), before).isExpired).toBe(false);
      expect(deriveRequestState(makeRow("pending", expiresAt), after).isExpired).toBe(true);
    });
  });
});
