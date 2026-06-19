import { describe, it, expect } from "vitest";
import { resolveRazorpayMode } from "./credentials";

describe("resolveRazorpayMode", () => {
  it("defaults to test when unset", () => {
    expect(resolveRazorpayMode(undefined)).toBe("test");
  });

  it("returns test for the literal 'test'", () => {
    expect(resolveRazorpayMode("test")).toBe("test");
  });

  it("returns live only for the exact literal 'live'", () => {
    expect(resolveRazorpayMode("live")).toBe("live");
  });

  it("fails safe to test for case variants and garbage values", () => {
    expect(resolveRazorpayMode("LIVE")).toBe("test");
    expect(resolveRazorpayMode("Live")).toBe("test");
    expect(resolveRazorpayMode("production")).toBe("test");
    expect(resolveRazorpayMode("")).toBe("test");
  });
});
