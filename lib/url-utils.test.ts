import { describe, it, expect } from "vitest";
import { isSafeReturnTo } from "./url-utils";

describe("isSafeReturnTo", () => {
  it("accepts plain same-origin paths", () => {
    expect(isSafeReturnTo("/groups")).toBe(true);
    expect(isSafeReturnTo("/join/abc123")).toBe(true);
    expect(isSafeReturnTo("/groups/123?period=2026-06")).toBe(true);
  });

  it("rejects missing/empty values", () => {
    expect(isSafeReturnTo(undefined)).toBe(false);
    expect(isSafeReturnTo(null)).toBe(false);
    expect(isSafeReturnTo("")).toBe(false);
  });

  it("rejects values without a leading slash", () => {
    expect(isSafeReturnTo("evil.com")).toBe(false);
    expect(isSafeReturnTo("https://evil.com")).toBe(false);
    // The URL "userinfo" trick: "https://oursite.com@evil.com" parses with
    // oursite.com as userinfo and evil.com as the actual host — but the raw
    // `next` value here ("@evil.com") never has a leading "/", so it's
    // already excluded by this check before any concatenation happens.
    expect(isSafeReturnTo("@evil.com")).toBe(false);
  });

  it("rejects protocol-relative paths", () => {
    expect(isSafeReturnTo("//evil.com")).toBe(false);
    expect(isSafeReturnTo("//evil.com/groups")).toBe(false);
  });

  it("rejects backslashes (browsers normalize \\ to // during relative-URL resolution)", () => {
    expect(isSafeReturnTo("/\\evil.com")).toBe(false);
    expect(isSafeReturnTo("/groups/\\evil.com")).toBe(false);
  });
});
