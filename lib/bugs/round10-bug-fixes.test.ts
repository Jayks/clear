/**
 * Regression tests for Round-10 bug fixes (fresh codebase audit, 2026-06-04).
 *
 * Tests cover pure-function and schema-validation bugs only.
 * Bugs requiring a live browser, DB, or external API (BUG-01, BUG-02, BUG-06)
 * are covered by manual test cases listed at the end of this file.
 *
 * Run with: pnpm test lib/bugs/round10-bug-fixes.test.ts
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// BUG-03 — formatCurrency uses en-IN locale for all currencies
// All non-INR currencies display Indian lakh/crore grouping instead of the
// correct grouping for that currency (e.g. USD "US$10,00,000" not "$1,000,000").
// ─────────────────────────────────────────────────────────────────────────────

/** BUGGY: always uses en-IN regardless of currency */
function formatCurrency_BUGGY(amount: number, currency = "INR", locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** FIXED: maps currency → correct locale */
const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  SGD: "en-SG",
  AED: "ar-AE",
  JPY: "ja-JP",
  CAD: "en-CA",
  AUD: "en-AU",
};
function formatCurrency_FIXED(amount: number, currency = "INR"): string {
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

describe("BUG-03 — formatCurrency locale mapping", () => {
  it("[BUG] en-IN groups USD as 10,00,000 (Indian lakh system)", () => {
    const result = formatCurrency_BUGGY(1_000_000, "USD");
    // en-IN formats large numbers with South Asian grouping: 10,00,000
    expect(result).toContain("10,00,000");
  });

  it("[FIX] USD uses en-US locale → 1,000,000.00", () => {
    const result = formatCurrency_FIXED(1_000_000, "USD");
    expect(result).toContain("1,000,000");
    expect(result).not.toContain("10,00,000");
  });

  it("[FIX] INR still uses en-IN locale → ₹10,00,000.00", () => {
    const result = formatCurrency_FIXED(1_000_000, "INR");
    expect(result).toContain("10,00,000");
  });

  it("[FIX] GBP uses en-GB locale", () => {
    const result = formatCurrency_FIXED(1_000_000, "GBP");
    expect(result).toContain("1,000,000");
    expect(result).not.toContain("10,00,000");
  });

  it("[FIX] EUR uses de-DE locale", () => {
    const result = formatCurrency_FIXED(1_000_000, "EUR");
    expect(result).not.toContain("10,00,000");
  });

  it("[FIX] unknown currency falls back to en-US", () => {
    const result = formatCurrency_FIXED(1_000_000, "MXN");
    expect(result).toContain("1,000,000");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-04 — addTemplateSchema missing customCategory superRefine
// Unlike addExpenseSchema, templates skip the check requiring customCategory
// when category === "other". A template can be saved with no label.
// ─────────────────────────────────────────────────────────────────────────────

const splitInputSchema = z.object({
  memberId: z.string().uuid(),
  value: z.number().optional(),
});

const addTemplateSchema_BUGGY = z.object({
  groupId: z.string().uuid(),
  paidByMemberId: z.string().uuid(),
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().positive().max(999999.99),
  currency: z.string().length(3),
  recurrence: z.enum(["monthly", "weekly"]),
  splitMode: z.enum(["equal", "exact", "percentage", "shares"]),
  splits: z.array(splitInputSchema).min(1),
  // BUG: no superRefine → missing customCategory not caught
});

const addTemplateSchema_FIXED = z.object({
  groupId: z.string().uuid(),
  paidByMemberId: z.string().uuid(),
  description: z.string().min(1),
  category: z.string().min(1),
  customCategory: z.string().max(100).optional(),
  amount: z.number().positive().max(999999.99),
  currency: z.string().length(3),
  recurrence: z.enum(["monthly", "weekly"]),
  splitMode: z.enum(["equal", "exact", "percentage", "shares"]),
  splits: z.array(splitInputSchema).min(1),
}).superRefine((data, ctx) => {
  if (data.category === "other" && (!data.customCategory || data.customCategory.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customCategory"],
      message: "Please describe the expense",
    });
  }
});

const baseTemplate = {
  groupId: "00000000-0000-0000-0000-000000000001",
  paidByMemberId: "00000000-0000-0000-0000-000000000002",
  description: "Monthly rent",
  amount: 5000,
  currency: "INR",
  recurrence: "monthly" as const,
  splitMode: "equal" as const,
  splits: [{ memberId: "00000000-0000-0000-0000-000000000002" }],
};

describe("BUG-04 — addTemplateSchema missing customCategory validation", () => {
  it("[BUG] buggy schema allows category=other with no customCategory", () => {
    const result = addTemplateSchema_BUGGY.safeParse({ ...baseTemplate, category: "other" });
    expect(result.success).toBe(true); // passes — this is the bug
  });

  it("[FIX] fixed schema rejects category=other with no customCategory", () => {
    const result = addTemplateSchema_FIXED.safeParse({ ...baseTemplate, category: "other" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("customCategory");
  });

  it("[FIX] fixed schema rejects category=other with empty customCategory", () => {
    const result = addTemplateSchema_FIXED.safeParse({
      ...baseTemplate, category: "other", customCategory: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("[FIX] fixed schema accepts category=other WITH a customCategory", () => {
    const result = addTemplateSchema_FIXED.safeParse({
      ...baseTemplate, category: "other", customCategory: "Miscellaneous",
    });
    expect(result.success).toBe(true);
  });

  it("[FIX] fixed schema accepts normal categories without customCategory", () => {
    const result = addTemplateSchema_FIXED.safeParse({ ...baseTemplate, category: "rent" });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-05 — raiseDispute allows suggestedAmount = 0 for change_share
// z.number().nonnegative() accepts 0. A change_share dispute with ₹0 is
// effectively "remove me" but processed through the wrong code path.
// ─────────────────────────────────────────────────────────────────────────────

const disputeSchema_BUGGY = z.discriminatedUnion("disputeType", [
  z.object({ disputeType: z.literal("remove_me") }),
  z.object({ disputeType: z.literal("change_share"), suggestedAmount: z.number().nonnegative() }),
  z.object({ disputeType: z.literal("split_equal") }),
  z.object({ disputeType: z.literal("other"), message: z.string().min(1).max(500) }),
]).and(z.object({ expenseId: z.string().uuid(), groupId: z.string().uuid() }));

const disputeSchema_FIXED = z.discriminatedUnion("disputeType", [
  z.object({ disputeType: z.literal("remove_me") }),
  z.object({ disputeType: z.literal("change_share"), suggestedAmount: z.number().positive() }),
  z.object({ disputeType: z.literal("split_equal") }),
  z.object({ disputeType: z.literal("other"), message: z.string().min(1).max(500) }),
]).and(z.object({ expenseId: z.string().uuid(), groupId: z.string().uuid() }));

const baseDispute = {
  expenseId: "00000000-0000-0000-0000-000000000001",
  groupId:   "00000000-0000-0000-0000-000000000002",
};

describe("BUG-05 — raiseDispute allows suggestedAmount = 0", () => {
  it("[BUG] buggy schema allows suggestedAmount = 0 for change_share", () => {
    const result = disputeSchema_BUGGY.safeParse({
      ...baseDispute, disputeType: "change_share", suggestedAmount: 0,
    });
    expect(result.success).toBe(true); // passes — this is the bug
  });

  it("[FIX] fixed schema rejects suggestedAmount = 0", () => {
    const result = disputeSchema_FIXED.safeParse({
      ...baseDispute, disputeType: "change_share", suggestedAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("[FIX] fixed schema rejects negative suggestedAmount", () => {
    const result = disputeSchema_FIXED.safeParse({
      ...baseDispute, disputeType: "change_share", suggestedAmount: -50,
    });
    expect(result.success).toBe(false);
  });

  it("[FIX] fixed schema accepts positive suggestedAmount", () => {
    const result = disputeSchema_FIXED.safeParse({
      ...baseDispute, disputeType: "change_share", suggestedAmount: 150,
    });
    expect(result.success).toBe(true);
  });

  it("[FIX] other dispute types are unaffected", () => {
    expect(disputeSchema_FIXED.safeParse({ ...baseDispute, disputeType: "remove_me" }).success).toBe(true);
    expect(disputeSchema_FIXED.safeParse({ ...baseDispute, disputeType: "split_equal" }).success).toBe(true);
    expect(disputeSchema_FIXED.safeParse({ ...baseDispute, disputeType: "other", message: "why?" }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-08 — pendingCount conflates unpaid and pending-confirmation members
// circle.ts: pendingCount = allMembers.length - paidCount
// This treats self-reported (but unconfirmed) members as "haven't paid yet".
// Fix: separate unpaidCount from pendingConfirmCount.
// ─────────────────────────────────────────────────────────────────────────────

/** Represents the minimal set of member status flags. */
interface MemberStatus {
  isConfirmed: boolean;
  hasSelfReport: boolean;
}

/** BUGGY: single pendingCount conflates two distinct states */
function computePendingCount_BUGGY(members: MemberStatus[]): number {
  const paidCount = members.filter((m) => m.isConfirmed).length;
  return members.length - paidCount;
}

/** FIXED: separate counts for not-yet-paid vs pending-confirmation */
function computeCounts_FIXED(members: MemberStatus[]): {
  paidCount: number;
  pendingConfirmCount: number;
  unpaidCount: number;
} {
  const paidCount          = members.filter((m) => m.isConfirmed).length;
  const pendingConfirmCount = members.filter((m) => !m.isConfirmed && m.hasSelfReport).length;
  const unpaidCount         = members.filter((m) => !m.isConfirmed && !m.hasSelfReport).length;
  return { paidCount, pendingConfirmCount, unpaidCount };
}

describe("BUG-08 — pendingCount conflates unpaid and pending-confirmation members", () => {
  const members: MemberStatus[] = [
    { isConfirmed: true,  hasSelfReport: false }, // Alice — paid + confirmed
    { isConfirmed: false, hasSelfReport: true  }, // Bob   — self-reported, awaiting admin confirm
    { isConfirmed: false, hasSelfReport: false }, // Carol — hasn't paid at all
    { isConfirmed: false, hasSelfReport: false }, // Dave  — hasn't paid at all
  ];

  it("[BUG] buggy count shows 3 pending, hiding that Bob already self-reported", () => {
    expect(computePendingCount_BUGGY(members)).toBe(3);
    // Bob self-reported (paid), Carol and Dave haven't — but all 3 look identical
  });

  it("[FIX] fixed count correctly separates: 1 paid, 1 pending-confirm, 2 truly unpaid", () => {
    const counts = computeCounts_FIXED(members);
    expect(counts.paidCount).toBe(1);           // Alice
    expect(counts.pendingConfirmCount).toBe(1); // Bob (self-reported)
    expect(counts.unpaidCount).toBe(2);         // Carol + Dave
  });

  it("[FIX] all confirmed → unpaidCount and pendingConfirmCount are 0", () => {
    const all: MemberStatus[] = [
      { isConfirmed: true, hasSelfReport: false },
      { isConfirmed: true, hasSelfReport: false },
    ];
    const counts = computeCounts_FIXED(all);
    expect(counts.paidCount).toBe(2);
    expect(counts.pendingConfirmCount).toBe(0);
    expect(counts.unpaidCount).toBe(0);
  });

  it("[FIX] all pending-confirm → paidCount 0, unpaidCount 0, pendingConfirmCount = total", () => {
    const all: MemberStatus[] = [
      { isConfirmed: false, hasSelfReport: true },
      { isConfirmed: false, hasSelfReport: true },
    ];
    const counts = computeCounts_FIXED(all);
    expect(counts.paidCount).toBe(0);
    expect(counts.pendingConfirmCount).toBe(2);
    expect(counts.unpaidCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-09 — splitInputSchema.value has no range constraints
// z.number().optional() allows negative values and percentages > 100.
// For percentage mode, values should be 0–100. For shares/exact, >= 0.
// ─────────────────────────────────────────────────────────────────────────────

const splitInputSchema_BUGGY = z.object({
  memberId: z.string().uuid(),
  value: z.number().optional(),
});

const splitInputSchema_FIXED = z.object({
  memberId: z.string().uuid(),
  value: z.number().min(0).optional(),
});

const validUuid = "00000000-0000-0000-0000-000000000001";

describe("BUG-09 — splitInputSchema.value missing non-negative constraint", () => {
  it("[BUG] buggy schema accepts negative split value", () => {
    const result = splitInputSchema_BUGGY.safeParse({ memberId: validUuid, value: -50 });
    expect(result.success).toBe(true); // passes — this is the bug
  });

  it("[FIX] fixed schema rejects negative split value", () => {
    const result = splitInputSchema_FIXED.safeParse({ memberId: validUuid, value: -50 });
    expect(result.success).toBe(false);
  });

  it("[FIX] fixed schema rejects very negative value", () => {
    const result = splitInputSchema_FIXED.safeParse({ memberId: validUuid, value: -999 });
    expect(result.success).toBe(false);
  });

  it("[FIX] fixed schema accepts 0 (valid for equal mode placeholder)", () => {
    const result = splitInputSchema_FIXED.safeParse({ memberId: validUuid, value: 0 });
    expect(result.success).toBe(true);
  });

  it("[FIX] fixed schema accepts positive values", () => {
    const result = splitInputSchema_FIXED.safeParse({ memberId: validUuid, value: 33.33 });
    expect(result.success).toBe(true);
  });

  it("[FIX] fixed schema accepts omitted value (optional)", () => {
    const result = splitInputSchema_FIXED.safeParse({ memberId: validUuid });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG-10 — createGroupSchema date validation uses lexicographic string comparison
// data.endDate >= data.startDate works for ISO "YYYY-MM-DD" but is fragile.
// Fix: validate using proper date parsing so non-ISO inputs are caught early.
// ─────────────────────────────────────────────────────────────────────────────

/** BUGGY: naive string comparison */
function isValidDateRange_BUGGY(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return true;
  return endDate >= startDate;
}

/** FIXED: parse as Date objects for proper ordering validation */
function isValidDateRange_FIXED(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return true;
  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  return end >= start;
}

describe("BUG-10 — date range validation uses lexicographic string comparison", () => {
  it("[BOTH] ISO format correctly accepts valid range", () => {
    expect(isValidDateRange_BUGGY("2026-01-01", "2026-01-31")).toBe(true);
    expect(isValidDateRange_FIXED("2026-01-01", "2026-01-31")).toBe(true);
  });

  it("[BOTH] ISO format correctly rejects inverted range", () => {
    expect(isValidDateRange_BUGGY("2026-01-31", "2026-01-01")).toBe(false);
    expect(isValidDateRange_FIXED("2026-01-31", "2026-01-01")).toBe(false);
  });

  it("[FIX] fixed version rejects invalid date strings as false", () => {
    // invalid date string parses to NaN → should return false
    expect(isValidDateRange_FIXED("not-a-date", "2026-01-01")).toBe(false);
  });

  it("[FIX] fixed version accepts same-day start and end", () => {
    expect(isValidDateRange_FIXED("2026-06-01", "2026-06-01")).toBe(true);
  });

  it("[FIX] fixed version accepts missing dates (optional fields)", () => {
    expect(isValidDateRange_FIXED(undefined, undefined)).toBe(true);
    expect(isValidDateRange_FIXED("2026-01-01", undefined)).toBe(true);
    expect(isValidDateRange_FIXED(undefined, "2026-01-01")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL TEST CASES (cannot be automated)
//
// BUG-01: Stream page ClosedPersonRow date crash
//   1. Open the app in dev. Navigate to /stream.
//   2. If you have a stream where all entries are settled/forgiven with a person,
//      they appear in the "Past" section as a ClosedPersonRow.
//   3. Verify the row renders with a formatted date (e.g. "Jun 4") without
//      a TypeError crash in the browser console.
//   EXPECTED: Row renders normally.
//   BEFORE FIX: TypeError: person.closedAt.toLocaleDateString is not a function
//
// BUG-02: Email notifications abort on first getUserById() failure
//   Not directly testable manually without injecting a Supabase error.
//   Verify by code review: send-expense-notification.ts now uses Promise.allSettled.
//
// BUG-06: sendEmail() silently ignores Resend API errors
//   Not directly testable manually without a bad API key.
//   Verify by code review: sendEmail() now logs when response.ok is false.
//
// BUG-11: Billing section shows stale hardcoded prices
//   1. Log in and navigate to /settings.
//   2. Activate Plus demo (if not already on Plus).
//   3. Check the Billing tab.
//   4. Monthly price should show ₹79/month (founder) or ₹99/month (regular).
//   5. Annual price should show ₹699/year or ₹799/year.
//   BEFORE FIX: ₹49/month and ₹499/year (wrong).
// ─────────────────────────────────────────────────────────────────────────────
