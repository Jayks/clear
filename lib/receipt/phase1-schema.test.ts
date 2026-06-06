/**
 * Phase 1 — DB Schema + Type Guards + Validation
 *
 * Tests:
 *   Schema  — parseExpenseLocation / parseReceiptItems type guards
 *   Validation — addExpenseSchema / addTemplateSchema / addCircleExpenseSchema
 *
 * Run with: pnpm test lib/receipt/phase1-schema.test.ts
 */

// All imports at the TOP — Turbopack crashes if imports appear after any const/function.
import { describe, it, expect } from "vitest";
import { parseExpenseLocation, parseReceiptItems } from "../db/schema/expenses";
import { addExpenseSchema, addTemplateSchema } from "../validations/expense";
import { addCircleExpenseSchema } from "../validations/circle-expense";

// ── parseExpenseLocation ──────────────────────────────────────────────────────

describe("parseExpenseLocation", () => {
  it("returns null for null", () => {
    expect(parseExpenseLocation(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseExpenseLocation(undefined)).toBeNull();
  });

  it("returns null for non-object (string)", () => {
    expect(parseExpenseLocation("Bangkok")).toBeNull();
  });

  it("returns null for non-object (number)", () => {
    expect(parseExpenseLocation(42)).toBeNull();
  });

  it("returns null when lat is missing", () => {
    expect(parseExpenseLocation({ lng: 100.5, name: "Place" })).toBeNull();
  });

  it("returns null when lng is missing", () => {
    expect(parseExpenseLocation({ lat: 13.7, name: "Place" })).toBeNull();
  });

  it("returns null when name is missing", () => {
    expect(parseExpenseLocation({ lat: 13.7, lng: 100.5 })).toBeNull();
  });

  it("returns null when lat is a string instead of number", () => {
    expect(
      parseExpenseLocation({ lat: "13.7", lng: 100.5, name: "Place" }),
    ).toBeNull();
  });

  it("returns null when name is a number instead of string", () => {
    expect(parseExpenseLocation({ lat: 13.7, lng: 100.5, name: 42 })).toBeNull();
  });

  it("returns typed object for valid {lat, lng, name}", () => {
    const result = parseExpenseLocation({ lat: 13.7, lng: 100.5, name: "Khao San Road" });
    expect(result).not.toBeNull();
    expect(result!.lat).toBe(13.7);
    expect(result!.lng).toBe(100.5);
    expect(result!.name).toBe("Khao San Road");
  });

  it("preserves optional address field when present", () => {
    const result = parseExpenseLocation({
      lat: 13.7,
      lng: 100.5,
      name: "Khao San Road",
      address: "Bangkok, Thailand",
    });
    expect(result).not.toBeNull();
    expect(result!.address).toBe("Bangkok, Thailand");
  });
});

// ── parseReceiptItems ─────────────────────────────────────────────────────────

describe("parseReceiptItems", () => {
  it("returns [] for null", () => {
    expect(parseReceiptItems(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(parseReceiptItems(undefined)).toEqual([]);
  });

  it("returns [] for non-array (object)", () => {
    expect(parseReceiptItems({ description: "Burger", amount: 150 })).toEqual([]);
  });

  it("returns [] for non-array (string)", () => {
    expect(parseReceiptItems("items")).toEqual([]);
  });

  it("filters out items missing description", () => {
    const raw = [{ amount: 100 }, { description: "Coffee", amount: 80 }];
    expect(parseReceiptItems(raw)).toHaveLength(1);
    expect(parseReceiptItems(raw)[0].description).toBe("Coffee");
  });

  it("filters out items missing amount", () => {
    const raw = [
      { description: "Tea" },
      { description: "Coffee", amount: 80 },
    ];
    expect(parseReceiptItems(raw)).toHaveLength(1);
  });

  it("filters out null entries inside the array", () => {
    const raw = [null, { description: "Burger", amount: 200 }];
    expect(parseReceiptItems(raw)).toHaveLength(1);
  });

  it("filters out items where amount is a string", () => {
    const raw = [{ description: "Burger", amount: "200" }];
    expect(parseReceiptItems(raw)).toHaveLength(0);
  });

  it("preserves valid items with optional quantity", () => {
    const raw = [{ description: "Samosa", amount: 20, quantity: 3 }];
    const result = parseReceiptItems(raw);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it("preserves valid items without quantity", () => {
    const raw = [{ description: "Latte", amount: 180 }];
    const result = parseReceiptItems(raw);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBeUndefined();
  });
});

// ── addExpenseSchema — new fields ─────────────────────────────────────────────

const BASE_EXPENSE = {
  groupId: "00000000-0000-0000-0000-000000000001",
  paidByMemberId: "00000000-0000-0000-0000-000000000002",
  description: "Dinner",
  category: "food",
  amount: 500,
  currency: "INR",
  expenseDate: "2026-06-06",
  splitMode: "equal" as const,
  splits: [{ memberId: "00000000-0000-0000-0000-000000000002", value: 500 }],
};

describe("addExpenseSchema — new receipt/location fields", () => {
  it("accepts a valid input with no new fields (backward compat)", () => {
    const result = addExpenseSchema.safeParse(BASE_EXPENSE);
    expect(result.success).toBe(true);
  });

  it("accepts wasAiScanned: true", () => {
    const result = addExpenseSchema.safeParse({ ...BASE_EXPENSE, wasAiScanned: true });
    expect(result.success).toBe(true);
  });

  it("accepts clearReceipt: true", () => {
    const result = addExpenseSchema.safeParse({ ...BASE_EXPENSE, clearReceipt: true });
    expect(result.success).toBe(true);
  });

  it("accepts a valid receiptUrl", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      receiptUrl: "https://example.com/receipt.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid receiptUrl (not a URL)", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      receiptUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid location object", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      location: { lat: 13.7, lng: 100.5, name: "Bangkok" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a location object missing lat", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      location: { lng: 100.5, name: "Bangkok" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a location object missing lng", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      location: { lat: 13.7, name: "Bangkok" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a location object missing name", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      location: { lat: 13.7, lng: 100.5 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid receiptItems array", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      receiptItems: [
        { description: "Burger", amount: 250 },
        { description: "Fries", amount: 100, quantity: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects receiptItems with negative amount", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      receiptItems: [{ description: "Refund", amount: -50 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts null location (explicitly null)", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      location: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null receiptUrl (explicitly null)", () => {
    const result = addExpenseSchema.safeParse({
      ...BASE_EXPENSE,
      receiptUrl: null,
    });
    expect(result.success).toBe(true);
  });
});

// ── addTemplateSchema — does NOT have wasAiScanned, receiptUrl, location, receiptItems ──

const BASE_TEMPLATE = {
  groupId: "00000000-0000-0000-0000-000000000001",
  paidByMemberId: "00000000-0000-0000-0000-000000000002",
  description: "Monthly rent",
  category: "rent",
  amount: 12000,
  currency: "INR",
  recurrence: "monthly" as const,
  splitMode: "equal" as const,
  splits: [{ memberId: "00000000-0000-0000-0000-000000000002", value: 12000 }],
};

describe("addTemplateSchema — does NOT have wasAiScanned, receiptUrl, location, receiptItems", () => {
  it("valid template input parses successfully", () => {
    expect(addTemplateSchema.safeParse(BASE_TEMPLATE).success).toBe(true);
  });

  it("wasAiScanned/receiptUrl/location/receiptItems are not in the schema shape", () => {
    // Extract the inner object shape from the ZodEffects wrapper
    type AnyZodEffects = { _def: { schema?: { shape?: Record<string, unknown> }; innerType?: { _def: { shape?: Record<string, unknown> } } } };
    const schemaKeys = Object.keys(
      (addTemplateSchema as unknown as AnyZodEffects)._def?.schema?.shape ??
      (addTemplateSchema as unknown as AnyZodEffects)._def?.innerType?._def?.shape ??
      {},
    );
    expect(schemaKeys).not.toContain("wasAiScanned");
    expect(schemaKeys).not.toContain("receiptUrl");
    expect(schemaKeys).not.toContain("location");
    expect(schemaKeys).not.toContain("receiptItems");
  });
});

// ── addCircleExpenseSchema — new receipt fields ───────────────────────────────

const BASE_CIRCLE_EXPENSE = {
  groupId: "00000000-0000-0000-0000-000000000001",
  description: "Venue booking",
  category: "venue",
  amount: 5000,
  currency: "INR",
  expenseDate: "2026-06-06",
  isAdvance: false,
};

describe("addCircleExpenseSchema — new receipt fields", () => {
  it("accepts valid input with no new fields (backward compat)", () => {
    expect(addCircleExpenseSchema.safeParse(BASE_CIRCLE_EXPENSE).success).toBe(true);
  });

  it("accepts receiptUrl: valid URL", () => {
    const result = addCircleExpenseSchema.safeParse({
      ...BASE_CIRCLE_EXPENSE,
      receiptUrl: "https://cdn.example.com/receipts/123.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects receiptUrl: invalid (not a URL)", () => {
    const result = addCircleExpenseSchema.safeParse({
      ...BASE_CIRCLE_EXPENSE,
      receiptUrl: "definitely-not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null receiptUrl", () => {
    const result = addCircleExpenseSchema.safeParse({
      ...BASE_CIRCLE_EXPENSE,
      receiptUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts wasAiScanned: true", () => {
    const result = addCircleExpenseSchema.safeParse({
      ...BASE_CIRCLE_EXPENSE,
      wasAiScanned: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts clearReceipt: true", () => {
    const result = addCircleExpenseSchema.safeParse({
      ...BASE_CIRCLE_EXPENSE,
      clearReceipt: true,
    });
    expect(result.success).toBe(true);
  });

  it("does NOT have location or receiptItems fields in schema shape", () => {
    type AnyZodEffects = { _def: { schema?: { shape?: Record<string, unknown> }; innerType?: { _def: { shape?: Record<string, unknown> } } } };
    const schemaKeys = Object.keys(
      (addCircleExpenseSchema as unknown as AnyZodEffects)._def?.schema?.shape ??
      (addCircleExpenseSchema as unknown as AnyZodEffects)._def?.innerType?._def?.shape ??
      {},
    );
    expect(schemaKeys).not.toContain("location");
    expect(schemaKeys).not.toContain("receiptItems");
  });
});
