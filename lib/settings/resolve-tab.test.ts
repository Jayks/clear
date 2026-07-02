import { describe, it, expect } from "vitest";
import { resolveSettingsTab } from "./resolve-tab";

describe("resolveSettingsTab", () => {
  it("returns the matching section for each valid tab value", () => {
    expect(resolveSettingsTab("profile")).toBe("profile");
    expect(resolveSettingsTab("appearance")).toBe("appearance");
    expect(resolveSettingsTab("billing")).toBe("billing");
    expect(resolveSettingsTab("notifications")).toBe("notifications");
  });

  it("defaults to profile for null", () => {
    expect(resolveSettingsTab(null)).toBe("profile");
  });

  it("defaults to profile for an empty string", () => {
    expect(resolveSettingsTab("")).toBe("profile");
  });

  it("defaults to profile for an unknown value", () => {
    expect(resolveSettingsTab("nonsense")).toBe("profile");
  });

  it("is case-sensitive — does not accept a differently-cased valid value", () => {
    expect(resolveSettingsTab("Billing")).toBe("profile");
  });
});
