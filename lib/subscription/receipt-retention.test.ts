import { describe, it, expect } from "vitest";
import { isReceiptExpired, RECEIPT_RETENTION_DAYS } from "./receipt-retention";

const NOW = new Date("2026-06-13T12:00:00Z");

/** Helper: a Date `days` before NOW. */
function ago(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe("isReceiptExpired", () => {
  it("never expires for a Plus group, even an old ended trip", () => {
    expect(
      isReceiptExpired({
        plan: "plus",
        createdAt: ago(3650),
        groupType: "trip",
        endDate: "2020-01-01",
        isArchived: true,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("keeps a free-tier proof within the retention window", () => {
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(RECEIPT_RETENTION_DAYS - 1),
        groupType: "nest",
        endDate: null,
        isArchived: false,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("keeps exactly at the boundary (age === RETENTION_DAYS)", () => {
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(RECEIPT_RETENTION_DAYS),
        groupType: "nest",
        endDate: null,
        isArchived: false,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("prunes a free-tier nest proof older than the window", () => {
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(RECEIPT_RETENTION_DAYS + 1),
        groupType: "nest",
        endDate: null,
        isArchived: false,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("prunes a free-tier ended-trip proof older than the window", () => {
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(120),
        groupType: "trip",
        endDate: "2026-01-10", // ended before NOW
        isArchived: false,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("keeps an active-trip proof even past the window (future end date)", () => {
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(120),
        groupType: "trip",
        endDate: "2026-07-01", // still ongoing
        isArchived: false,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("keeps an open-ended (null end date) trip proof past the window", () => {
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(120),
        groupType: "trip",
        endDate: null,
        isArchived: false,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("prunes an archived trip past the window even if end date is future", () => {
    // Archived overrides the still-active exemption.
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(120),
        groupType: "trip",
        endDate: "2026-07-01",
        isArchived: true,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("prunes a free-tier circle proof older than the window (circles aren't trips)", () => {
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(120),
        groupType: "circle",
        endDate: null,
        isArchived: false,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("keeps a trip ending exactly today (active through end-of-day)", () => {
    expect(
      isReceiptExpired({
        plan: "free",
        createdAt: ago(120),
        groupType: "trip",
        endDate: "2026-06-13", // === today
        isArchived: false,
        now: NOW,
      }),
    ).toBe(false);
  });
});
