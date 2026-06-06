/**
 * Phase 2 — Core Pipeline: rate limiting, geocoding URLs, AI confidence logic
 *
 * Tests pure functions only — no mocking of auth/DB/Anthropic.
 * Server action integration tests (guard order, updateExpenseMedia auth)
 * are covered by manual test cases.
 *
 * Run with: pnpm test lib/receipt/phase2-pipeline.test.ts
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { checkReceiptScanLimit, checkAiRateLimit } from "../rate-limit";
import { reverseGeocode, buildForwardGeocodeUrl, forwardGeocode } from "../geocoding";
import {
  computeConfidence,
  isEmptyReceiptResponse,
  type ReceiptResponseData,
} from "./parse-helpers";

// ── checkReceiptScanLimit ─────────────────────────────────────────────────────

describe("checkReceiptScanLimit", () => {
  it("allows the first 20 calls for a user", () => {
    const userId = `scan-user-${Date.now()}-a`;
    for (let i = 0; i < 20; i++) {
      expect(checkReceiptScanLimit(userId)).toBe(true);
    }
  });

  it("blocks the 21st call", () => {
    const userId = `scan-user-${Date.now()}-b`;
    for (let i = 0; i < 20; i++) checkReceiptScanLimit(userId);
    expect(checkReceiptScanLimit(userId)).toBe(false);
  });

  it("resets independently after 24h (simulated by using a fresh userId)", () => {
    // Each userId is an isolated entry — a new userId starts at 0
    const userId = `scan-user-${Date.now()}-c`;
    for (let i = 0; i < 20; i++) checkReceiptScanLimit(userId);
    expect(checkReceiptScanLimit(userId)).toBe(false);

    // A new (different) user still gets their full 20 allowance
    const freshUser = `scan-user-${Date.now()}-fresh`;
    expect(checkReceiptScanLimit(freshUser)).toBe(true);
  });

  it("is independent from checkAiRateLimit (separate in-memory store)", () => {
    const userId = `scan-user-${Date.now()}-d`;
    // Exhaust the hourly AI limit (20 calls)
    for (let i = 0; i < 20; i++) checkAiRateLimit(userId);
    expect(checkAiRateLimit(userId)).toBe(false);

    // Scan limit for the SAME user should still be unaffected (fresh)
    expect(checkReceiptScanLimit(userId)).toBe(true);
  });
});

// ── reverseGeocode ────────────────────────────────────────────────────────────

describe("reverseGeocode", () => {
  it("returns null when NEXT_PUBLIC_MAPBOX_TOKEN is not set (non-fatal)", async () => {
    const saved = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const result = await reverseGeocode(13.7, 100.5);
    expect(result).toBeNull();
    if (saved !== undefined) process.env.NEXT_PUBLIC_MAPBOX_TOKEN = saved;
  });

  it("returns null on fetch error without throwing (non-fatal)", async () => {
    // Stub fetch to throw a network error
    const originalFetch = global.fetch;
    vi.stubGlobal("fetch", () => Promise.reject(new Error("Network error")));
    // Provide a fake token so the fetch path is reached
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.fake-token-for-test";
    const result = await reverseGeocode(13.7, 100.5);
    expect(result).toBeNull();
    vi.unstubAllGlobals();
    if (originalFetch) global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });
});

// ── forwardGeocode URL ────────────────────────────────────────────────────────

describe("buildForwardGeocodeUrl", () => {
  it("does NOT include country=in (Clear is international)", () => {
    const url = buildForwardGeocodeUrl("Bangkok", "pk.fake-token");
    expect(url).not.toContain("country=");
    expect(url).not.toContain("country=in");
  });

  it("includes the query and token in the URL", () => {
    const url = buildForwardGeocodeUrl("Tokyo", "pk.my-token");
    expect(url).toContain("Tokyo");
    expect(url).toContain("pk.my-token");
    expect(url).toContain("language=en");
    expect(url).toContain("limit=5");
  });
});

describe("forwardGeocode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  it("returns [] on AbortError without throwing", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.fake-token-for-test";
    vi.stubGlobal("fetch", () => {
      const err = new DOMException("The user aborted a request.", "AbortError");
      return Promise.reject(err);
    });
    const result = await forwardGeocode("Bangkok");
    expect(result).toEqual([]);
  });

  it("returns [] when token is missing", async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const result = await forwardGeocode("Bangkok");
    expect(result).toEqual([]);
  });

  it("returns [] on fetch network error", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.fake-token-for-test";
    vi.stubGlobal("fetch", () => Promise.reject(new Error("Network error")));
    const result = await forwardGeocode("Bangkok");
    expect(result).toEqual([]);
  });
});

// ── computeConfidence ─────────────────────────────────────────────────────────

describe("computeConfidence", () => {
  it("returns 'high' when amount + description + date all present", () => {
    const data: ReceiptResponseData = {
      description: "Spice Garden",
      amount: 450,
      expenseDate: "2026-06-06",
    };
    expect(computeConfidence(data)).toBe("high");
  });

  it("returns 'medium' when amount + description present but date missing", () => {
    const data: ReceiptResponseData = {
      description: "Spice Garden",
      amount: 450,
      expenseDate: null,
    };
    expect(computeConfidence(data)).toBe("medium");
  });

  it("returns 'low' when amount is missing regardless of other fields", () => {
    const data: ReceiptResponseData = {
      description: "Spice Garden",
      amount: null,
      expenseDate: "2026-06-06",
    };
    expect(computeConfidence(data)).toBe("low");
  });

  it("returns 'low' when description is missing regardless of other fields", () => {
    const data: ReceiptResponseData = {
      description: "",
      amount: 450,
      expenseDate: "2026-06-06",
    };
    expect(computeConfidence(data)).toBe("low");
  });

  it("returns 'low' when both amount and description are missing", () => {
    const data: ReceiptResponseData = {
      description: null,
      amount: null,
      expenseDate: null,
    };
    expect(computeConfidence(data)).toBe("low");
  });
});

// ── isEmptyReceiptResponse ────────────────────────────────────────────────────

describe("isEmptyReceiptResponse", () => {
  it("returns true when amount, description, and receiptItems are all missing", () => {
    const data: ReceiptResponseData = {
      description: "",
      amount: null,
      receiptItems: [],
    };
    expect(isEmptyReceiptResponse(data)).toBe(true);
  });

  it("returns false when amount is present", () => {
    expect(isEmptyReceiptResponse({ amount: 100, description: "", receiptItems: [] })).toBe(false);
  });

  it("returns false when description is present", () => {
    expect(isEmptyReceiptResponse({ amount: null, description: "Coffee", receiptItems: [] })).toBe(false);
  });

  it("returns false when receiptItems are present", () => {
    expect(
      isEmptyReceiptResponse({
        amount: null,
        description: "",
        receiptItems: [{ description: "Latte", amount: 180 }],
      }),
    ).toBe(false);
  });

  it("returns true when description is only whitespace", () => {
    expect(isEmptyReceiptResponse({ amount: null, description: "   ", receiptItems: [] })).toBe(true);
  });
});
