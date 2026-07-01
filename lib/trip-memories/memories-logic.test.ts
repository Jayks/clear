import { describe, it, expect } from "vitest";
import { getAlbumHostLabel, isAtPhotoCap } from "./host-label";
import { getGroupConfig } from "../group-config";
import { createGroupSchema } from "../validations/trip";

// ─── isTrip flag ────────────────────────────────────────────────────────────

describe("GROUP_CONFIG — isTrip flag", () => {
  it("trip groups have isTrip=true", () => {
    expect(getGroupConfig("trip").isTrip).toBe(true);
  });

  it("nest groups have isTrip=false", () => {
    expect(getGroupConfig("nest").isTrip).toBe(false);
  });

  it("circle groups have isTrip=false", () => {
    expect(getGroupConfig("circle").isTrip).toBe(false);
  });

  it("isCircle and isTrip are mutually exclusive", () => {
    const trip   = getGroupConfig("trip");
    const nest   = getGroupConfig("nest");
    const circle = getGroupConfig("circle");

    expect(trip.isTrip && trip.isCircle).toBe(false);
    expect(nest.isTrip || nest.isCircle).toBe(false);
    expect(circle.isTrip).toBe(false);
    expect(circle.isCircle).toBe(true);
  });
});

// ─── photoAlbumUrl validation ────────────────────────────────────────────────

describe("createGroupSchema — photoAlbumUrl field", () => {
  const base = { name: "Goa trip", defaultCurrency: "INR" };

  it("accepts a valid HTTPS URL", () => {
    const r = createGroupSchema.safeParse({
      ...base,
      photoAlbumUrl: "https://photos.google.com/share/abc123",
    });
    expect(r.success).toBe(true);
  });

  it("accepts an iCloud Photos URL", () => {
    const r = createGroupSchema.safeParse({
      ...base,
      photoAlbumUrl: "https://www.icloud.com/photos/abc123",
    });
    expect(r.success).toBe(true);
  });

  it("accepts an empty string (field is optional)", () => {
    const r = createGroupSchema.safeParse({ ...base, photoAlbumUrl: "" });
    expect(r.success).toBe(true);
  });

  it("accepts when field is omitted", () => {
    const r = createGroupSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rejects a non-URL string", () => {
    const r = createGroupSchema.safeParse({
      ...base,
      photoAlbumUrl: "not-a-url",
    });
    expect(r.success).toBe(false);
  });
});

// ─── Album host label ─────────────────────────────────────────────────────────

describe("getAlbumHostLabel", () => {
  it("recognises Google Photos", () => {
    expect(getAlbumHostLabel("https://photos.google.com/share/abc")).toBe("Google Photos");
  });

  it("recognises iCloud Photos", () => {
    expect(getAlbumHostLabel("https://www.icloud.com/photos/abc")).toBe("iCloud Photos");
  });

  it("recognises Flickr", () => {
    expect(getAlbumHostLabel("https://www.flickr.com/photos/user/sets/123")).toBe("Flickr");
  });

  it("recognises Amazon Photos", () => {
    expect(getAlbumHostLabel("https://www.amazon.in/photos/share/abc")).toBe("Amazon Photos");
  });

  it("strips www. from an unknown host", () => {
    expect(getAlbumHostLabel("https://www.example.com/album")).toBe("example.com");
  });

  it("returns fallback for a malformed URL", () => {
    expect(getAlbumHostLabel("not-a-url")).toBe("Photo album");
  });
});

// ─── Photo cap ───────────────────────────────────────────────────────────────

describe("isAtPhotoCap", () => {
  it("false when below cap", () => {
    expect(isAtPhotoCap(0)).toBe(false);
    expect(isAtPhotoCap(15)).toBe(false);
    expect(isAtPhotoCap(29)).toBe(false);
  });

  it("true exactly at cap (30)", () => {
    expect(isAtPhotoCap(30)).toBe(true);
  });

  it("true when above cap", () => {
    expect(isAtPhotoCap(31)).toBe(true);
  });
});

// ─── canUploadTripMemories model (Plus-only) ──────────────────────────────────

describe("canUploadTripMemories model — Plus gate", () => {
  /**
   * Mirrors the real gates.ts implementation (which requires a DB connection).
   * Both must stay in sync: the rule is "user must be on the Plus plan."
   */
  function canUploadTripMemoriesModel(plan: "plus" | "free"): boolean {
    return plan === "plus";
  }

  it("Plus users can upload", () => {
    expect(canUploadTripMemoriesModel("plus")).toBe(true);
  });

  it("Free users cannot upload", () => {
    expect(canUploadTripMemoriesModel("free")).toBe(false);
  });
});
