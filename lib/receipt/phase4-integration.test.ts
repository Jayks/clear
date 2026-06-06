/**
 * Phase 4 — Form Integration tests
 * Pure-function tests (no DOM, no DB, no server actions)
 */
import { describe, it, expect } from "vitest";
import { mapToGroupCategory } from "./map-category";

describe("mapToGroupCategory", () => {
  // ── Same category in target group type ───────────────────────────────────
  it("returns 'food' for trip (exists)", () => {
    expect(mapToGroupCategory("food", "trip")).toBe("food");
  });

  it("returns 'food' for nest (exists)", () => {
    expect(mapToGroupCategory("food", "nest")).toBe("food");
  });

  it("returns 'food' for circle (exists)", () => {
    expect(mapToGroupCategory("food", "circle")).toBe("food");
  });

  it("returns 'transport' for trip (exists)", () => {
    expect(mapToGroupCategory("transport", "trip")).toBe("transport");
  });

  it("returns 'transport' for circle (exists)", () => {
    expect(mapToGroupCategory("transport", "circle")).toBe("transport");
  });

  it("returns 'groceries' for nest (exists)", () => {
    expect(mapToGroupCategory("groceries", "nest")).toBe("groceries");
  });

  it("returns 'groceries' for trip (exists)", () => {
    expect(mapToGroupCategory("groceries", "trip")).toBe("groceries");
  });

  it("returns 'activities' for trip (exists)", () => {
    expect(mapToGroupCategory("activities", "trip")).toBe("activities");
  });

  it("returns 'activities' for circle (exists)", () => {
    expect(mapToGroupCategory("activities", "circle")).toBe("activities");
  });

  it("returns 'other' for any group when input is 'other'", () => {
    expect(mapToGroupCategory("other", "trip")).toBe("other");
    expect(mapToGroupCategory("other", "nest")).toBe("other");
    expect(mapToGroupCategory("other", "circle")).toBe("other");
  });

  // ── Cross-type mappings ───────────────────────────────────────────────────
  it("maps 'accommodation' → 'rent' for nest", () => {
    expect(mapToGroupCategory("accommodation", "nest")).toBe("rent");
  });

  it("maps 'accommodation' → 'venue' for circle", () => {
    expect(mapToGroupCategory("accommodation", "circle")).toBe("venue");
  });

  it("maps 'sightseeing' → 'other' for nest", () => {
    expect(mapToGroupCategory("sightseeing", "nest")).toBe("other");
  });

  it("maps 'sightseeing' → 'activities' for circle", () => {
    expect(mapToGroupCategory("sightseeing", "circle")).toBe("activities");
  });

  it("maps 'shopping' → 'supplies' for nest", () => {
    expect(mapToGroupCategory("shopping", "nest")).toBe("supplies");
  });

  it("maps 'shopping' → 'supplies' for circle", () => {
    expect(mapToGroupCategory("shopping", "circle")).toBe("supplies");
  });

  it("maps 'tour_package' → 'other' for nest", () => {
    expect(mapToGroupCategory("tour_package", "nest")).toBe("other");
  });

  it("maps 'tour_package' → 'other' for circle", () => {
    expect(mapToGroupCategory("tour_package", "circle")).toBe("other");
  });

  it("maps 'rent' → 'accommodation' for trip", () => {
    expect(mapToGroupCategory("rent", "trip")).toBe("accommodation");
  });

  it("maps 'rent' → 'other' for circle (no matching circle category)", () => {
    expect(mapToGroupCategory("rent", "circle")).toBe("other");
  });

  it("maps 'subscriptions' → 'other' for trip", () => {
    expect(mapToGroupCategory("subscriptions", "trip")).toBe("other");
  });

  it("maps 'subscriptions' → 'other' for circle", () => {
    expect(mapToGroupCategory("subscriptions", "circle")).toBe("other");
  });

  it("maps 'maintenance' → 'other' for trip", () => {
    expect(mapToGroupCategory("maintenance", "trip")).toBe("other");
  });

  it("maps 'maintenance' → 'equipment' for circle", () => {
    expect(mapToGroupCategory("maintenance", "circle")).toBe("equipment");
  });

  it("maps 'groceries' → 'supplies' for circle (no groceries in circles)", () => {
    expect(mapToGroupCategory("groceries", "circle")).toBe("supplies");
  });

  it("maps 'venue' → 'activities' for trip", () => {
    expect(mapToGroupCategory("venue", "trip")).toBe("activities");
  });

  it("maps 'venue' → 'other' for nest", () => {
    expect(mapToGroupCategory("venue", "nest")).toBe("other");
  });

  it("maps 'gift' → 'shopping' for trip", () => {
    expect(mapToGroupCategory("gift", "trip")).toBe("shopping");
  });

  it("maps 'gift' → 'other' for nest", () => {
    expect(mapToGroupCategory("gift", "nest")).toBe("other");
  });

  it("maps 'equipment' → 'other' for trip", () => {
    expect(mapToGroupCategory("equipment", "trip")).toBe("other");
  });

  it("maps 'equipment' → 'supplies' for nest", () => {
    expect(mapToGroupCategory("equipment", "nest")).toBe("supplies");
  });

  // ── Unknown / unrecognised categories fall back to 'other' ───────────────
  it("returns 'other' for completely unknown AI category in trip", () => {
    expect(mapToGroupCategory("unknown_ai_category", "trip")).toBe("other");
  });

  it("returns 'other' for completely unknown AI category in nest", () => {
    expect(mapToGroupCategory("xyz_not_real", "nest")).toBe("other");
  });

  it("returns 'other' for completely unknown AI category in circle", () => {
    expect(mapToGroupCategory("something_weird", "circle")).toBe("other");
  });

  it("returns 'other' for empty string", () => {
    expect(mapToGroupCategory("", "trip")).toBe("other");
  });

  // ── Idempotency — mapping a category that's already correct ─────────────
  it("is idempotent: mapToGroupCategory('food', 'trip') stays 'food'", () => {
    const first = mapToGroupCategory("food", "trip");
    const second = mapToGroupCategory(first, "trip");
    expect(first).toBe(second);
  });

  it("is idempotent: mapToGroupCategory('activities', 'circle') stays 'activities'", () => {
    const first = mapToGroupCategory("activities", "circle");
    const second = mapToGroupCategory(first, "circle");
    expect(first).toBe(second);
  });

  // ── 'healthcare' cross-type ───────────────────────────────────────────────
  it("maps 'healthcare' → 'other' for trip", () => {
    expect(mapToGroupCategory("healthcare", "trip")).toBe("other");
  });

  it("maps 'healthcare' → 'other' for circle", () => {
    expect(mapToGroupCategory("healthcare", "circle")).toBe("other");
  });

  // ── 'utilities' cross-type ────────────────────────────────────────────────
  it("maps 'utilities' → 'other' for trip", () => {
    expect(mapToGroupCategory("utilities", "trip")).toBe("other");
  });

  it("maps 'utilities' → 'other' for circle", () => {
    expect(mapToGroupCategory("utilities", "circle")).toBe("other");
  });

  // ── 'supplies' cross-type — exists in nest and circle, not trip ──────────
  it("maps 'supplies' → 'other' for trip (no supplies in trip categories)", () => {
    expect(mapToGroupCategory("supplies", "trip")).toBe("other");
  });

  it("returns 'supplies' for nest (exists)", () => {
    expect(mapToGroupCategory("supplies", "nest")).toBe("supplies");
  });

  it("returns 'supplies' for circle (exists)", () => {
    expect(mapToGroupCategory("supplies", "circle")).toBe("supplies");
  });
});
