import { describe, it, expect } from "vitest";
import { averageColor, enhanceTint, rgbToHsl, hslToRgb } from "./cover-tint";

describe("averageColor", () => {
  it("averages opaque pixels", () => {
    // two pixels: black + white → mid grey
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    expect(averageColor(data)).toEqual({ r: 128, g: 128, b: 128 });
  });

  it("ignores fully transparent pixels", () => {
    // one red opaque + one green FULLY transparent → red only
    const data = new Uint8ClampedArray([200, 10, 10, 255, 0, 255, 0, 0]);
    expect(averageColor(data)).toEqual({ r: 200, g: 10, b: 10 });
  });

  it("returns black when there are no opaque pixels", () => {
    const data = new Uint8ClampedArray([255, 255, 255, 0]);
    expect(averageColor(data)).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe("enhanceTint", () => {
  it("returns a valid CSS rgb() string", () => {
    expect(enhanceTint({ r: 30, g: 80, b: 160 })).toMatch(/^rgb\(\d{1,3} \d{1,3} \d{1,3}\)$/);
  });

  it("brightens a very dark colour into the mid band", () => {
    const out = enhanceTint({ r: 8, g: 12, b: 40 });
    const [r, g, b] = out.match(/\d+/g)!.map(Number);
    // lightness clamp floor is 0.4 → channels should sum well above the input's
    expect(r + g + b).toBeGreaterThan(8 + 12 + 40);
  });

  it("keeps near-grey near-grey (does not fabricate a hue)", () => {
    const out = enhanceTint({ r: 130, g: 130, b: 130 });
    const [r, g, b] = out.match(/\d+/g)!.map(Number);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(2);
  });

  it("preserves colourfulness of a vivid input", () => {
    const out = enhanceTint({ r: 200, g: 40, b: 40 });
    const [r, g, b] = out.match(/\d+/g)!.map(Number);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(40);
  });
});

describe("rgbToHsl / hslToRgb round-trip", () => {
  it("round-trips primary colours", () => {
    for (const [r, g, b] of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [120, 200, 90]]) {
      const [h, s, l] = rgbToHsl(r, g, b);
      const [r2, g2, b2] = hslToRgb(h, s, l);
      expect(Math.abs(r2 - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(g2 - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(b2 - b)).toBeLessThanOrEqual(1);
    }
  });
});
