/**
 * lib/payment-requests/whatsapp.test.ts
 *
 * Unit tests for the pure message-builder helpers.
 * No DB, no env vars — all inputs injected.
 */
import { describe, it, expect } from "vitest";
import {
  buildCircleReminderMessage,
  buildPersonalRequestMessage,
} from "./whatsapp";

// ── buildCircleReminderMessage ────────────────────────────────────────────────

const BASE_REMINDER = {
  circleName:        "Goa Trip",
  periodLabel:       "June 2026",
  paidCount:         5,
  totalCount:        8,
  pendingMembers:    [
    { name: "Rahul", token: "aaa-token-1" },
    { name: "Priya", token: "bbb-token-2" },
  ],
  pendingClearNames: ["Amit"],
  amount:            1000,
  currency:          "INR",
  joinUrl:           "https://clear.app/join/test-token",
  appUrl:            "https://clear.app",
};

describe("buildCircleReminderMessage", () => {
  it("includes the circle name", () => {
    expect(buildCircleReminderMessage(BASE_REMINDER)).toContain("Goa Trip");
  });

  it("includes period label when provided", () => {
    expect(buildCircleReminderMessage(BASE_REMINDER)).toContain("June 2026");
  });

  it("omits period label when null", () => {
    const msg = buildCircleReminderMessage({ ...BASE_REMINDER, periodLabel: null });
    expect(msg).not.toContain("June 2026");
  });

  it("includes paid/total fraction", () => {
    expect(buildCircleReminderMessage(BASE_REMINDER)).toContain("5/8");
  });

  it("includes ASCII progress bar characters", () => {
    const msg = buildCircleReminderMessage(BASE_REMINDER);
    expect(msg).toMatch(/[█░]/);
  });

  it("includes per-ghost payment token URLs", () => {
    const msg = buildCircleReminderMessage(BASE_REMINDER);
    expect(msg).toContain("https://clear.app/request/aaa-token-1");
    expect(msg).toContain("https://clear.app/request/bbb-token-2");
  });

  it("includes ghost names alongside their URLs", () => {
    const msg = buildCircleReminderMessage(BASE_REMINDER);
    expect(msg).toContain("Rahul");
    expect(msg).toContain("Priya");
  });

  it("includes Clear-account member names in pending list", () => {
    const msg = buildCircleReminderMessage(BASE_REMINDER);
    expect(msg).toContain("Amit");
  });

  it("does NOT add a /request/ link for Clear-account members (they use the app)", () => {
    const msg = buildCircleReminderMessage(BASE_REMINDER);
    // Amit is a Clear user — no bullet entry in the "Pay your share" section
    // Ghost entries look like "• Name: https://clear.app/request/..."
    expect(msg).not.toContain("• Amit:");
    expect(msg).not.toContain("Amit: https://");
  });

  it("includes the join URL", () => {
    expect(buildCircleReminderMessage(BASE_REMINDER)).toContain(
      "https://clear.app/join/test-token",
    );
  });

  it("omits the pay-links section when no ghost members are pending", () => {
    const msg = buildCircleReminderMessage({ ...BASE_REMINDER, pendingMembers: [] });
    expect(msg).not.toContain("/request/");
  });

  it("truncates pending names at 4 with (+N more) suffix", () => {
    const msg = buildCircleReminderMessage({
      ...BASE_REMINDER,
      pendingMembers: [
        { name: "A", token: "t1" },
        { name: "B", token: "t2" },
        { name: "C", token: "t3" },
      ],
      pendingClearNames: ["D", "E"],  // total 5 pending
    });
    expect(msg).toContain("+2 more");
    expect(msg).not.toContain(", D,");
  });

  it("shows 'Everyone has paid' when all pending arrays are empty", () => {
    const msg = buildCircleReminderMessage({
      ...BASE_REMINDER,
      pendingMembers:    [],
      pendingClearNames: [],
    });
    expect(msg).toContain("Everyone has paid");
  });

  it("does not output 'null' or 'undefined' for Flexi circles (amount=null)", () => {
    const msg = buildCircleReminderMessage({ ...BASE_REMINDER, amount: null });
    expect(msg).not.toContain("null");
    expect(msg).not.toContain("undefined");
  });

  it("correctly builds the progress bar at 0% (all 8 blocks empty)", () => {
    const msg = buildCircleReminderMessage({
      ...BASE_REMINDER,
      paidCount: 0,
    });
    expect(msg).toContain("░░░░░░░░");
  });

  it("correctly builds the progress bar at 100% (all 8 blocks filled)", () => {
    const msg = buildCircleReminderMessage({
      ...BASE_REMINDER,
      paidCount: 8,
    });
    expect(msg).toContain("████████");
  });
});

// ── buildPersonalRequestMessage ───────────────────────────────────────────────

const BASE_PERSONAL = {
  payerName:   "Rahul Kumar",
  circleName:  "Goa Trip",
  periodLabel: "June 2026",
  amount:      1000,
  currency:    "INR",
  requestUrl:  "https://clear.app/request/abc-token",
  upiId:       null,
};

describe("buildPersonalRequestMessage", () => {
  it("uses the payer's first name only in the greeting", () => {
    const msg = buildPersonalRequestMessage(BASE_PERSONAL);
    expect(msg).toContain("Rahul");
    // Full last name should not appear in the greeting line
    const firstLine = msg.split("\n")[0];
    expect(firstLine).not.toContain("Kumar");
  });

  it("includes the circle name", () => {
    expect(buildPersonalRequestMessage(BASE_PERSONAL)).toContain("Goa Trip");
  });

  it("includes period label when provided", () => {
    expect(buildPersonalRequestMessage(BASE_PERSONAL)).toContain("June 2026");
  });

  it("omits period when null", () => {
    const msg = buildPersonalRequestMessage({ ...BASE_PERSONAL, periodLabel: null });
    expect(msg).not.toContain("June 2026");
  });

  it("includes the request URL", () => {
    expect(buildPersonalRequestMessage(BASE_PERSONAL)).toContain(
      "https://clear.app/request/abc-token",
    );
  });

  it("includes formatted amount when fixed", () => {
    const msg = buildPersonalRequestMessage(BASE_PERSONAL);
    // 1000 INR → "₹1,000" or "1,000" — either way digits must appear
    expect(msg).toContain("1,000");
  });

  it("omits the Amount line entirely when amount is null (Flexi)", () => {
    const msg = buildPersonalRequestMessage({ ...BASE_PERSONAL, amount: null });
    expect(msg).not.toContain("Amount:");
  });

  it("does not output 'null' or 'undefined' when amount is null", () => {
    const msg = buildPersonalRequestMessage({ ...BASE_PERSONAL, amount: null });
    expect(msg).not.toContain("null");
    expect(msg).not.toContain("undefined");
  });

  it("includes UPI ID hint when provided", () => {
    const msg = buildPersonalRequestMessage({ ...BASE_PERSONAL, upiId: "admin@upi" });
    expect(msg).toContain("admin@upi");
  });

  it("omits UPI hint when upiId is null", () => {
    const msg = buildPersonalRequestMessage(BASE_PERSONAL); // upiId: null
    // No UPI handle in message
    expect(msg).not.toMatch(/@[a-z]/);
  });
});
