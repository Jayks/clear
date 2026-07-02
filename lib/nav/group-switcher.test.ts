import { describe, it, expect } from "vitest";
import { typeLabel, resolveSwitchSection, targetHref } from "./group-switcher";

describe("typeLabel", () => {
  it("labels a recurring circle", () => {
    expect(typeLabel({ groupType: "circle", circleMode: "recurring" })).toBe("Circle · Recurring");
  });
  it("labels a one_time circle", () => {
    expect(typeLabel({ groupType: "circle", circleMode: "one_time" })).toBe("Circle · One-time");
  });
  it("labels a nest", () => {
    expect(typeLabel({ groupType: "nest" })).toBe("Nest");
  });
  it("labels a trip", () => {
    expect(typeLabel({ groupType: "trip" })).toBe("Trip");
  });
});

describe("resolveSwitchSection", () => {
  it("keeps expenses for any target type", () => {
    expect(resolveSwitchSection("expenses", "circle")).toBe("expenses");
    expect(resolveSwitchSection("expenses", "trip")).toBe("expenses");
  });
  it("keeps members for any target type", () => {
    expect(resolveSwitchSection("members", "circle")).toBe("members");
  });
  it("keeps settle/insights for non-circle targets", () => {
    expect(resolveSwitchSection("settle", "trip")).toBe("settle");
    expect(resolveSwitchSection("insights", "nest")).toBe("insights");
  });
  it("falls back to overview for settle/insights on a circle target", () => {
    expect(resolveSwitchSection("settle", "circle")).toBe("");
    expect(resolveSwitchSection("insights", "circle")).toBe("");
  });
  it("falls back to overview for an unknown/empty current section", () => {
    expect(resolveSwitchSection("", "trip")).toBe("");
    expect(resolveSwitchSection("thread", "trip")).toBe("");
  });
});

describe("targetHref", () => {
  it("builds a section href when the section is kept", () => {
    expect(targetHref("g1", "expenses", "trip")).toBe("/groups/g1/expenses");
  });
  it("builds a bare overview href when the section falls back", () => {
    expect(targetHref("g1", "settle", "circle")).toBe("/groups/g1");
  });
  it("builds a bare overview href for an empty current section", () => {
    expect(targetHref("g1", "", "trip")).toBe("/groups/g1");
  });
});
