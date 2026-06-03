/**
 * Dispute reason logic tests.
 *
 * These are pure-logic tests that verify:
 *  1. The dispute reason options are complete and non-empty
 *  2. The notification body builder correctly includes the reason
 *  3. The reason is optional (graceful degradation when absent)
 */

import { describe, it, expect } from "vitest";

// ── Constants mirrored from PaymentPendingBadge ──────────────────────────────

const DISPUTE_REASONS = [
  { value: "not_received",     label: "Didn't receive this" },
  { value: "wrong_amount",     label: "Wrong amount"         },
  { value: "already_recorded", label: "Already recorded"     },
  { value: "other",            label: "Other reason"         },
] as const;

type DisputeReason = (typeof DISPUTE_REASONS)[number]["value"];

function getDisputeLabel(value: DisputeReason): string {
  return DISPUTE_REASONS.find((r) => r.value === value)?.label ?? "Other";
}

// ── Notification body builders (mirrors logic in server actions) ─────────────

function buildSettlementDisputeBody(
  disputerName: string,
  amountStr: string,
  reason?: string,
): string {
  const reasonSuffix = reason ? ` Reason: "${reason}".` : "";
  return `${disputerName} disputed your ${amountStr} payment.${reasonSuffix} Please re-check and report again.`;
}

function buildStreamDisputeBody(
  disputerName: string,
  amountStr: string,
  reason?: string,
): string {
  const reasonSuffix = reason ? ` Reason: "${reason}".` : "";
  return `${disputerName} disputed the ${amountStr} payment.${reasonSuffix} Please re-check and try again.`;
}

function buildCircleDisputeBody(
  groupName: string,
  periodLabel: string | null,
  reason?: string,
): string {
  const reasonSuffix = reason ? ` Reason: "${reason}".` : "";
  return periodLabel
    ? `Your ${periodLabel} payment wasn't confirmed.${reasonSuffix} Please check and try again.`
    : `Your payment wasn't confirmed.${reasonSuffix} Please check and try again.`;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("dispute reason options", () => {
  it("has exactly 4 preset reasons", () => {
    expect(DISPUTE_REASONS).toHaveLength(4);
  });

  it("all reasons have non-empty value and label", () => {
    for (const r of DISPUTE_REASONS) {
      expect(r.value.length).toBeGreaterThan(0);
      expect(r.label.length).toBeGreaterThan(0);
    }
  });

  it("all reason values are unique", () => {
    const values = DISPUTE_REASONS.map((r) => r.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("getDisputeLabel", () => {
  it("returns correct label for each preset reason", () => {
    expect(getDisputeLabel("not_received")).toBe("Didn't receive this");
    expect(getDisputeLabel("wrong_amount")).toBe("Wrong amount");
    expect(getDisputeLabel("already_recorded")).toBe("Already recorded");
    expect(getDisputeLabel("other")).toBe("Other reason");
  });
});

describe("buildSettlementDisputeBody", () => {
  it("includes reason when provided", () => {
    const body = buildSettlementDisputeBody("Priya", "₹1,200", "Didn't receive this");
    expect(body).toContain('Reason: "Didn\'t receive this"');
    expect(body).toContain("Priya disputed your ₹1,200 payment");
  });

  it("omits reason suffix when not provided", () => {
    const body = buildSettlementDisputeBody("Priya", "₹1,200");
    expect(body).not.toContain("Reason:");
    expect(body).toContain("Please re-check and report again.");
  });

  it("includes both disputer name and amount", () => {
    const body = buildSettlementDisputeBody("Rahul", "₹500", "Wrong amount");
    expect(body).toContain("Rahul");
    expect(body).toContain("₹500");
  });
});

describe("buildStreamDisputeBody", () => {
  it("includes reason when provided", () => {
    const body = buildStreamDisputeBody("Arjun", "₹2,000", "Wrong amount");
    expect(body).toContain('Reason: "Wrong amount"');
    expect(body).toContain("Arjun disputed the ₹2,000 payment");
  });

  it("omits reason suffix when not provided", () => {
    const body = buildStreamDisputeBody("Arjun", "₹2,000");
    expect(body).not.toContain("Reason:");
    expect(body).toContain("Please re-check and try again.");
  });
});

describe("buildCircleDisputeBody", () => {
  it("includes period label when provided", () => {
    const body = buildCircleDisputeBody("Savings Circle", "June 2026", "Already recorded");
    expect(body).toContain("June 2026 payment");
    expect(body).toContain('Reason: "Already recorded"');
  });

  it("uses generic body when period is null", () => {
    const body = buildCircleDisputeBody("Savings Circle", null);
    expect(body).toContain("Your payment wasn't confirmed.");
    expect(body).not.toContain("null");
  });

  it("omits reason suffix when no reason provided", () => {
    const body = buildCircleDisputeBody("Circle", "May 2026");
    expect(body).not.toContain("Reason:");
  });
});
