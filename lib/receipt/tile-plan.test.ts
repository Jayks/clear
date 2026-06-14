/**
 * Tile-plan geometry tests — pure logic for slicing long receipts.
 *
 * Run with: pnpm test lib/receipt/tile-plan.test.ts
 */

import { describe, it, expect } from "vitest";
import { planReceiptTiles, TILE_DEFAULTS, type ReceiptTile } from "./tile-plan";

// Helper: total source coverage must span the whole original height with no gaps.
function assertFullCoverage(tiles: ReceiptTile[], originalHeight: number) {
  expect(tiles[0].sy).toBe(0);
  const last = tiles[tiles.length - 1];
  // Last tile reaches the bottom (allow 1px rounding slack).
  expect(last.sy + last.sHeight).toBeGreaterThanOrEqual(originalHeight - 1);
  // No vertical gap between consecutive tiles.
  for (let i = 1; i < tiles.length; i++) {
    expect(tiles[i].sy).toBeLessThanOrEqual(tiles[i - 1].sy + tiles[i - 1].sHeight);
  }
  // No tile runs past the image bounds.
  for (const t of tiles) {
    expect(t.sy + t.sHeight).toBeLessThanOrEqual(originalHeight);
  }
}

describe("planReceiptTiles — normal aspect ratios", () => {
  it("landscape photo → single tile, downscaled to maxWidth", () => {
    const tiles = planReceiptTiles(1600, 1200);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].dWidth).toBe(TILE_DEFAULTS.maxWidth); // 800
    expect(tiles[0].dHeight).toBe(600);                   // 1200 * (800/1600)
    expect(tiles[0]).toMatchObject({ sx: 0, sy: 0, sWidth: 1600, sHeight: 1200 });
  });

  it("portrait 3:4 photo → single tile", () => {
    const tiles = planReceiptTiles(1200, 1600); // ratio 1.33
    expect(tiles).toHaveLength(1);
  });

  it("phone 9:16 photo → single tile (not treated as a long receipt)", () => {
    const tiles = planReceiptTiles(1080, 1920); // scaled 800×1422, ratio ~1.78
    expect(tiles).toHaveLength(1);
  });

  it("small image is not upscaled — width stays original", () => {
    const tiles = planReceiptTiles(400, 300);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].dWidth).toBe(400);
    expect(tiles[0].dHeight).toBe(300);
  });

  it("ratio exactly at the tall threshold → still a single tile", () => {
    // width 800, ratio 2.5 → height 2000
    const tiles = planReceiptTiles(800, 2000);
    expect(tiles).toHaveLength(1);
  });
});

describe("planReceiptTiles — long receipts", () => {
  it("ratio just over threshold → multiple tiles", () => {
    const tiles = planReceiptTiles(800, 2100); // ratio 2.625
    expect(tiles.length).toBeGreaterThan(1);
    assertFullCoverage(tiles, 2100);
  });

  it("long receipt (1:6) → several tiles, all under the cap, full coverage", () => {
    const tiles = planReceiptTiles(1000, 6000);
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles.length).toBeLessThanOrEqual(TILE_DEFAULTS.maxTiles);
    assertFullCoverage(tiles, 6000);
    for (const t of tiles) {
      expect(t.dWidth).toBe(TILE_DEFAULTS.maxWidth);
      // Each tile's long edge stays at or below the cap-friendly target.
      expect(t.dHeight).toBeLessThanOrEqual(TILE_DEFAULTS.tileMaxHeight + 1);
    }
  });

  it("consecutive tiles overlap (no item split across a hard seam)", () => {
    const tiles = planReceiptTiles(1000, 6000);
    for (let i = 1; i < tiles.length; i++) {
      // Next tile starts strictly before the previous one ends.
      expect(tiles[i].sy).toBeLessThan(tiles[i - 1].sy + tiles[i - 1].sHeight);
    }
  });

  it("extreme receipt is capped at maxTiles but still covers fully", () => {
    const tiles = planReceiptTiles(1000, 20000);
    expect(tiles).toHaveLength(TILE_DEFAULTS.maxTiles);
    assertFullCoverage(tiles, 20000);
  });

  it("respects a custom maxTiles cap", () => {
    const tiles = planReceiptTiles(1000, 20000, { maxTiles: 2 });
    expect(tiles).toHaveLength(2);
    assertFullCoverage(tiles, 20000);
  });
});
