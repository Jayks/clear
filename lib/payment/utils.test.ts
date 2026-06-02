import { describe, it, expect } from "vitest";
import {
  buildTransactionNote,
  buildUpiDeepLink,
  buildGPayLink,
  buildPhonePeLink,
  buildWhatsAppRequestUrl,
  buildUpiQrContent,
} from "./utils";

describe("buildTransactionNote", () => {
  it("prefixes context name with 'Clear · '", () => {
    expect(buildTransactionNote("Goa Trip")).toBe("Clear · Goa Trip");
  });
  it("works with empty string", () => {
    expect(buildTransactionNote("")).toBe("Clear · ");
  });
});

describe("buildUpiDeepLink", () => {
  it("produces a upi:// deep link with all standard params", () => {
    const url = buildUpiDeepLink("name@okaxis", 1200, "INR", "Clear · Goa Trip");
    expect(url).toMatch(/^upi:\/\/pay\?/);
    expect(url).toContain("pa=name%40okaxis");
    expect(url).toContain("am=1200");
    expect(url).toContain("cu=INR");
    expect(url).toContain("tn=Clear+%C2%B7+Goa+Trip");
  });

  it("truncates transaction note to 50 chars", () => {
    const longNote = "A".repeat(60);
    const url = buildUpiDeepLink("a@b", 100, "INR", longNote);
    const params = new URL(url.replace("upi://", "https://x.com/")).searchParams;
    expect(params.get("tn")!.length).toBeLessThanOrEqual(50);
  });
});

describe("buildGPayLink", () => {
  it("produces a tez:// deep link", () => {
    const url = buildGPayLink("name@okaxis", 500, "INR", "Clear · Trip");
    expect(url).toMatch(/^tez:\/\/upi\/pay\?/);
    expect(url).toContain("pa=name%40okaxis");
    expect(url).toContain("am=500");
  });
});

describe("buildPhonePeLink", () => {
  it("produces a phonepe:// deep link", () => {
    const url = buildPhonePeLink("name@okaxis", 750, "INR", "Clear · Trip");
    expect(url).toMatch(/^phonepe:\/\/pay\?/);
    expect(url).toContain("pa=name%40okaxis");
    expect(url).toContain("am=750");
  });
});

describe("buildUpiQrContent", () => {
  it("returns the same format as buildUpiDeepLink (QR uses generic upi:// — works via camera on iOS)", () => {
    const qr   = buildUpiQrContent("a@b", 100, "INR", "Clear · Test");
    const link = buildUpiDeepLink("a@b", 100, "INR", "Clear · Test");
    expect(qr).toBe(link);
    expect(qr).toMatch(/^upi:\/\//);
  });
});

describe("buildWhatsAppRequestUrl", () => {
  it("produces a wa.me link with URL-encoded message", () => {
    const url = buildWhatsAppRequestUrl("Pay me ₹100");
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(url).toContain(encodeURIComponent("Pay me ₹100"));
  });
});
