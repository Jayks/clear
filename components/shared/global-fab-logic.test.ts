import { describe, it, expect } from "vitest";
import { resolvePickerSections, type PickerGroupLike } from "./global-fab-logic";

// Tiny helper to build the minimal group shape the logic needs.
function g(id: string, isDemo = false): PickerGroupLike {
  return { group: { id, isDemo } };
}

describe("resolvePickerSections", () => {
  it("puts the first N non-demo groups in Recent and the rest in the full list", () => {
    const trips = [g("t1"), g("t2")];
    const nests = [g("n1")];
    const r = resolvePickerSections({
      trips, nests, circles: [], recentCount: 2, hasStreams: false,
    });

    expect(r.recentGroups.map((x) => x.group.id)).toEqual(["t1", "t2"]);
    // t1/t2 pulled into Recent → only n1 remains in the lists
    expect(r.remainingTrips).toEqual([]);
    expect(r.remainingNests.map((x) => x.group.id)).toEqual(["n1"]);
    expect(r.showFullList).toBe(true);
  });

  it("combines types in trip→nest→circle order for Recent", () => {
    const r = resolvePickerSections({
      trips: [g("t1")], nests: [g("n1")], circles: [g("c1")],
      recentCount: 2, hasStreams: false,
    });
    expect(r.recentGroups.map((x) => x.group.id)).toEqual(["t1", "n1"]);
  });

  it("excludes demo groups from Recent but keeps them in the full list", () => {
    const trips = [g("demo", true), g("t1")];
    const r = resolvePickerSections({
      trips, nests: [], circles: [], recentCount: 2, hasStreams: false,
    });
    // demo never surfaces as a Recent tile
    expect(r.recentGroups.map((x) => x.group.id)).toEqual(["t1"]);
    // but it still appears in the list (t1 was promoted to Recent, demo stays)
    expect(r.remainingTrips.map((x) => x.group.id)).toEqual(["demo"]);
    expect(r.showFullList).toBe(true);
  });

  it("shows no full list when every group fits in Recent", () => {
    const r = resolvePickerSections({
      trips: [g("t1")], nests: [g("n1")], circles: [],
      recentCount: 2, hasStreams: false,
    });
    expect(r.recentGroups).toHaveLength(2);
    expect(r.showFullList).toBe(false);
  });

  it("gates the People section on hasStreams", () => {
    const base = { trips: [g("t1")], nests: [], circles: [], recentCount: 2 };
    expect(resolvePickerSections({ ...base, hasStreams: true }).showPeople).toBe(true);
    expect(resolvePickerSections({ ...base, hasStreams: false }).showPeople).toBe(false);
  });

  it("handles a fully empty input without throwing", () => {
    const r = resolvePickerSections({
      trips: [], nests: [], circles: [], recentCount: 2, hasStreams: false,
    });
    expect(r.recentGroups).toEqual([]);
    expect(r.showFullList).toBe(false);
    expect(r.showPeople).toBe(false);
  });

  it("treats a demo-only user as having no real Recent tiles", () => {
    const r = resolvePickerSections({
      trips: [g("d1", true)], nests: [g("d2", true)], circles: [],
      recentCount: 2, hasStreams: false,
    });
    expect(r.recentGroups).toEqual([]);
    // demos still reachable via the full list
    expect(r.showFullList).toBe(true);
    expect(r.remainingTrips.map((x) => x.group.id)).toEqual(["d1"]);
  });
});
