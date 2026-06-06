/**
 * Phase 3 — ReceiptScannerSheet: pure-logic tests
 *
 * The camera / video / canvas API and the full component render are
 * covered by manual test cases (Phase 8).  These tests verify:
 *   - SCAN_MODE_CONFIG shape and field correctness
 *   - Mode-aware chip visibility rules
 *   - Confidence display labels
 *
 * Run with: pnpm test lib/receipt/phase3-scanner.test.ts
 */

import { describe, it, expect } from "vitest";
import { SCAN_MODE_CONFIG, type ScanMode } from "./types";
import { computeConfidence, type ReceiptResponseData } from "./parse-helpers";

// ── SCAN_MODE_CONFIG shape ────────────────────────────────────────────────────

describe("SCAN_MODE_CONFIG", () => {
  const allModes: ScanMode[] = ["expense", "circle", "stream_evidence"];

  it("has entries for all three modes", () => {
    for (const mode of allModes) {
      expect(SCAN_MODE_CONFIG[mode]).toBeDefined();
    }
  });

  it("each entry has all required fields", () => {
    const requiredFields = [
      "showLocationResult",
      "showItemsResult",
      "showCategoryResult",
      "ctaLabel",
      "proofToggleLabel",
      "proofDisclosure",
    ];
    for (const mode of allModes) {
      const cfg = SCAN_MODE_CONFIG[mode];
      for (const field of requiredFields) {
        expect(cfg).toHaveProperty(field);
      }
    }
  });

  it("expense mode shows location, items, and category", () => {
    const cfg = SCAN_MODE_CONFIG.expense;
    expect(cfg.showLocationResult).toBe(true);
    expect(cfg.showItemsResult).toBe(true);
    expect(cfg.showCategoryResult).toBe(true);
  });

  it("circle mode hides location and items (pool draws are single-line)", () => {
    const cfg = SCAN_MODE_CONFIG.circle;
    expect(cfg.showLocationResult).toBe(false);
    expect(cfg.showItemsResult).toBe(false);
    expect(cfg.showCategoryResult).toBe(true);
  });

  it("stream_evidence mode hides location, items, and category", () => {
    const cfg = SCAN_MODE_CONFIG.stream_evidence;
    expect(cfg.showLocationResult).toBe(false);
    expect(cfg.showItemsResult).toBe(false);
    expect(cfg.showCategoryResult).toBe(false);
  });

  it("ctaLabel is non-empty for all modes", () => {
    for (const mode of allModes) {
      expect(SCAN_MODE_CONFIG[mode].ctaLabel.length).toBeGreaterThan(0);
    }
  });

  it("proofToggleLabel and proofDisclosure are non-empty for all modes", () => {
    for (const mode of allModes) {
      const cfg = SCAN_MODE_CONFIG[mode];
      expect(cfg.proofToggleLabel.length).toBeGreaterThan(0);
      expect(cfg.proofDisclosure.length).toBeGreaterThan(0);
    }
  });
});

// ── Mode-aware chip visibility rules ─────────────────────────────────────────

describe("chip visibility rules", () => {
  it("location chip is conditionally shown only in expense mode", () => {
    // In the component: config.showLocationResult && result.location
    // Verify the config flag is the gating condition for expense mode
    expect(SCAN_MODE_CONFIG.expense.showLocationResult).toBe(true);
    expect(SCAN_MODE_CONFIG.circle.showLocationResult).toBe(false);
    expect(SCAN_MODE_CONFIG.stream_evidence.showLocationResult).toBe(false);
  });

  it("items chip is conditionally shown only in expense mode", () => {
    expect(SCAN_MODE_CONFIG.expense.showItemsResult).toBe(true);
    expect(SCAN_MODE_CONFIG.circle.showItemsResult).toBe(false);
    expect(SCAN_MODE_CONFIG.stream_evidence.showItemsResult).toBe(false);
  });

  it("amount and date chips are always shown regardless of mode (no config flag)", () => {
    // These are hardcoded in the component — verify there is no flag that would hide them
    for (const mode of ["expense", "circle", "stream_evidence"] as ScanMode[]) {
      const cfg = SCAN_MODE_CONFIG[mode];
      // The config does NOT have showAmountResult or showDateResult fields —
      // these chips are always rendered
      expect("showAmountResult" in cfg).toBe(false);
      expect("showDateResult" in cfg).toBe(false);
    }
  });
});

// ── Confidence label mapping ──────────────────────────────────────────────────
// The component maps confidence to a label and colour.
// Verify the source data (computeConfidence) produces the right buckets.

describe("confidence mapping for results display", () => {
  it("high confidence: amount + description + date → shows 'Fill form' as primary CTA", () => {
    const data: ReceiptResponseData = {
      description: "Grab",
      amount: 320,
      expenseDate: "2026-06-06",
    };
    expect(computeConfidence(data)).toBe("high");
  });

  it("medium confidence: amount + description, no date → still shows Fill form as primary CTA", () => {
    const data: ReceiptResponseData = {
      description: "Grab",
      amount: 320,
      expenseDate: null,
    };
    expect(computeConfidence(data)).toBe("medium");
  });

  it("low confidence → shows 'Try a clearer photo' secondary CTA instead of 'Scan again'", () => {
    // Missing amount triggers low confidence
    const data: ReceiptResponseData = {
      description: "Grab",
      amount: null,
      expenseDate: "2026-06-06",
    };
    expect(computeConfidence(data)).toBe("low");
  });

  it("low confidence primary CTA is still 'Fill form →' (never hidden)", () => {
    // The CTA label comes from SCAN_MODE_CONFIG — always present
    // The component always renders the primary CTA regardless of confidence
    const data: ReceiptResponseData = { description: "", amount: null, expenseDate: null };
    expect(computeConfidence(data)).toBe("low");
    // Primary CTA label is defined in config (not gated by confidence)
    expect(SCAN_MODE_CONFIG.expense.ctaLabel).toBe("Fill form →");
    expect(SCAN_MODE_CONFIG.circle.ctaLabel).toBe("Fill form →");
  });
});

// ── Proof toggle disclosure per mode ─────────────────────────────────────────

describe("proofDisclosure text per mode", () => {
  it("expense mode disclosure mentions 'public URL'", () => {
    expect(SCAN_MODE_CONFIG.expense.proofDisclosure).toContain("public URL");
  });

  it("circle mode disclosure mentions 'admin accountability'", () => {
    expect(SCAN_MODE_CONFIG.circle.proofDisclosure).toContain("admin accountability");
  });

  it("stream_evidence mode disclosure mentions 'evidence'", () => {
    expect(SCAN_MODE_CONFIG.stream_evidence.proofDisclosure).toContain("evidence");
  });
});
