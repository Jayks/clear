import { describe, it, expect } from "vitest";
import { resolveHomeTab } from "./initial-view";

const base = { justSeeded: false, storedTab: null, hasArchived: false, hasSample: false };

describe("resolveHomeTab", () => {
  it("lands on Sample right after seeding", () => {
    expect(resolveHomeTab({ ...base, justSeeded: true, hasSample: true })).toBe("sample");
  });

  it("ignores justSeeded if there are somehow no samples", () => {
    expect(resolveHomeTab({ ...base, justSeeded: true, hasSample: false })).toBe("active");
  });

  it("restores the last tab the user was on", () => {
    expect(resolveHomeTab({ ...base, storedTab: "sample", hasSample: true })).toBe("sample");
    expect(resolveHomeTab({ ...base, storedTab: "archived", hasArchived: true })).toBe("archived");
    expect(resolveHomeTab({ ...base, storedTab: "active" })).toBe("active");
  });

  it("does NOT restore a tab whose content no longer exists", () => {
    expect(resolveHomeTab({ ...base, storedTab: "sample", hasSample: false })).toBe("active");
    expect(resolveHomeTab({ ...base, storedTab: "archived", hasArchived: false })).toBe("active");
  });

  it("justSeeded wins over a stored tab", () => {
    expect(resolveHomeTab({ justSeeded: true, storedTab: "active", hasArchived: false, hasSample: true })).toBe("sample");
  });

  it("defaults to Active with no signal", () => {
    expect(resolveHomeTab(base)).toBe("active");
    expect(resolveHomeTab({ ...base, hasSample: true })).toBe("active"); // not just-seeded → stay Active
  });
});
