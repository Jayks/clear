import { describe, it, expect } from "vitest";
import {
  buildTransactionNote,
  buildUpiDeepLink,
  buildGPayLink,
  buildPhonePeLink,
  buildWhatsAppRequestUrl,
  buildUpiQrContent,
  buildPaymentPageUrl,
} from "./utils";

describe("buildTransactionNote", () => {
  it("prefixes context name with 'Clear · '", () => {
    expect(buildTransactionNote("Goa Trip")).toBe("Clear · Goa Trip");
  });
  it("works with empty string", () => {
    expect(buildTransactionNote("")).toBe("Clear · ");
  });
  it("handles unicode context names", () => {
    expect(buildTransactionNote("मुंबई")).toBe("Clear · मुंबई");
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

  it("handles decimal amounts", () => {
    const url = buildUpiDeepLink("a@b", 1234.50, "INR", "Clear · Test");
    expect(url).toContain("am=1234.5");
  });

  it("handles special characters in VPA", () => {
    const url = buildUpiDeepLink("user.name+tag@okicici", 500, "INR", "Clear · T");
    expect(url).toContain("pa=user.name%2Btag%40okicici");
  });
});

describe("buildGPayLink", () => {
  it("produces a tez:// deep link", () => {
    const url = buildGPayLink("name@okaxis", 500, "INR", "Clear · Trip");
    expect(url).toMatch(/^tez:\/\/upi\/pay\?/);
    expect(url).toContain("pa=name%40okaxis");
    expect(url).toContain("am=500");
  });

  it("uses same param structure as generic UPI link", () => {
    const gpay = buildGPayLink("a@b", 100, "INR", "Clear · X");
    const generic = buildUpiDeepLink("a@b", 100, "INR", "Clear · X");
    // Same query params, different scheme
    const gpayParams  = new URL(gpay.replace("tez://upi", "https://x.com")).searchParams;
    const genericParams = new URL(generic.replace("upi://", "https://x.com/")).searchParams;
    expect(gpayParams.get("pa")).toBe(genericParams.get("pa"));
    expect(gpayParams.get("am")).toBe(genericParams.get("am"));
    expect(gpayParams.get("tn")).toBe(genericParams.get("tn"));
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

  it("QR content is always generic upi:// even when app-specific links differ", () => {
    const qr    = buildUpiQrContent("vpa@upi", 500, "INR", "Clear · Trip");
    const gpay  = buildGPayLink("vpa@upi", 500, "INR", "Clear · Trip");
    expect(qr).not.toMatch(/^tez:\/\//);
    expect(gpay).toMatch(/^tez:\/\//);
  });
});

describe("buildWhatsAppRequestUrl", () => {
  it("produces a wa.me link with URL-encoded message", () => {
    const url = buildWhatsAppRequestUrl("Pay me ₹100");
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(url).toContain(encodeURIComponent("Pay me ₹100"));
  });

  it("handles multi-line messages", () => {
    const msg = "Pay me ₹100\nFor Goa Trip";
    const url = buildWhatsAppRequestUrl(msg);
    expect(url).toContain(encodeURIComponent(msg));
  });
});

describe("buildPaymentPageUrl", () => {
  it("builds a /pay URL with all required params (server context — uses NEXT_PUBLIC_APP_URL fallback)", () => {
    // In test env window is undefined, so it uses the process.env / hardcoded fallback
    const url = buildPaymentPageUrl("user123", 1200, "INR", "Goa Trip");
    expect(url).toMatch(/\/pay\?/);
    expect(url).toContain("to=user123");
    expect(url).toContain("am=1200");
    expect(url).toContain("cu=INR");
    expect(url).toContain("tn=Goa+Trip");
  });

  it("includes ref=groupId when provided", () => {
    const url = buildPaymentPageUrl("user123", 500, "INR", "Trip", "group456");
    expect(url).toContain("ref=group456");
  });

  it("does not include ref when groupId is omitted", () => {
    const url = buildPaymentPageUrl("user123", 500, "INR", "Trip");
    expect(url).not.toContain("ref=");
  });
});
