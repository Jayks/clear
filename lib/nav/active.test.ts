import { describe, it, expect } from "vitest";
import { isNavItemActive } from "./active";

describe("isNavItemActive", () => {
  it("matches the exact href", () => {
    expect(isNavItemActive("/groups", "/groups")).toBe(true);
    expect(isNavItemActive("/insights", "/insights")).toBe(true);
    expect(isNavItemActive("/stream", "/stream")).toBe(true);
  });

  it("matches descendant paths", () => {
    expect(isNavItemActive("/groups/abc123", "/groups")).toBe(true);
    expect(isNavItemActive("/groups/abc/settle", "/groups")).toBe(true);
    expect(isNavItemActive("/stream/confirm/tok", "/stream")).toBe(true);
    expect(isNavItemActive("/stream/person-id", "/stream")).toBe(true);
  });

  it("does NOT match a sibling that merely shares the prefix", () => {
    expect(isNavItemActive("/insightsfoo", "/insights")).toBe(false);
    expect(isNavItemActive("/streaming", "/stream")).toBe(false);
    expect(isNavItemActive("/groups-archive", "/groups")).toBe(false);
  });

  it("does not cross-match unrelated tabs", () => {
    expect(isNavItemActive("/insights", "/groups")).toBe(false);
    expect(isNavItemActive("/stream", "/insights")).toBe(false);
    expect(isNavItemActive("/groups", "/stream")).toBe(false);
  });

  it("a group detail page keeps Home active (default descendant match), not Streams/Insights", () => {
    const path = "/groups/xyz/expenses";
    expect(isNavItemActive(path, "/groups")).toBe(true);
    expect(isNavItemActive(path, "/stream")).toBe(false);
    expect(isNavItemActive(path, "/insights")).toBe(false);
  });

  describe("exact mode (Home — don't light inside a specific group)", () => {
    it("active only on the exact href", () => {
      expect(isNavItemActive("/groups", "/groups", true)).toBe(true);
    });

    it("NOT active on a specific group's sub-pages", () => {
      expect(isNavItemActive("/groups/abc123", "/groups", true)).toBe(false);
      expect(isNavItemActive("/groups/abc/settle", "/groups", true)).toBe(false);
      expect(isNavItemActive("/groups/new", "/groups", true)).toBe(false);
    });
  });
});
