import { describe, it, expect } from "vitest";
import { resolveHomeTab } from "./initial-view";

const base = { storedTab: null, hasArchived: false, hasSample: false };

describe("resolveHomeTab", () => {
  it("restores the last tab the user was on", () => {
    expect(resolveHomeTab({ ...base, storedTab: "sample", hasSample: true })).toBe("sample");
    expect(resolveHomeTab({ ...base, storedTab: "archived", hasArchived: true })).toBe("archived");
    expect(resolveHomeTab({ ...base, storedTab: "active" })).toBe("active");
  });

  it("does NOT restore a tab whose content no longer exists", () => {
    expect(resolveHomeTab({ ...base, storedTab: "sample", hasSample: false })).toBe("active");
    expect(resolveHomeTab({ ...base, storedTab: "archived", hasArchived: false })).toBe("active");
  });

  it("defaults to Active with no stored tab", () => {
    expect(resolveHomeTab(base)).toBe("active");
    expect(resolveHomeTab({ ...base, hasSample: true })).toBe("active");
  });
});
