/**
 * Pure geometry for splitting a tall receipt image into vertical tiles.
 *
 * Why this exists: the Anthropic vision API downscales any image whose long
 * edge exceeds ~1568px (and total area beyond ~1.15 MP). A long thermal receipt
 * photographed in one frame gets squashed to ~260px wide server-side, making the
 * line items illegible. Splitting the single capture into overlapping vertical
 * strips — each kept under the cap — keeps every row sharp; the model then merges
 * the strips back into one receipt (see parse-receipt.ts).
 *
 * This module is browser-free and fully unit-tested. The Canvas slicing that
 * consumes the plan lives in lib/image-utils.ts (`prepareReceiptImages`).
 */

export interface ReceiptTile {
  sx:      number; // source crop origin x (original-image px)
  sy:      number; // source crop origin y (original-image px)
  sWidth:  number; // source crop width  (original-image px)
  sHeight: number; // source crop height (original-image px)
  dWidth:  number; // destination canvas width
  dHeight: number; // destination canvas height
}

export interface TilePlanOptions {
  /** Max output width; the image is downscaled (never upscaled) to this. */
  maxWidth?:     number;
  /** Target height per tile in output px — keeps each tile under the MP cap. */
  tileMaxHeight?: number;
  /** Fractional vertical overlap between consecutive tiles (0–1). */
  overlapRatio?: number;
  /** height/width above which the image is treated as a long receipt. */
  tallRatio?:    number;
  /** Hard cap on tile count, to bound tokens/latency on extreme receipts. */
  maxTiles?:     number;
}

export const TILE_DEFAULTS = {
  maxWidth:      800,
  tileMaxHeight: 1400, // 800×1400 ≈ 1.12 MP and 1400px long edge — under the cap
  overlapRatio:  0.1,
  tallRatio:     2.5,
  maxTiles:      4,
} as const;

/**
 * Plan how to slice an image of the given pixel dimensions.
 *
 * Returns a single full-image tile for normal-aspect photos, or N overlapping
 * vertical tiles (2 ≤ N ≤ maxTiles) for tall receipts. Tiles always cover the
 * full height with no gaps; when the receipt is so long it would need more than
 * `maxTiles` strips, the tiles grow taller instead (mild server-side downscale —
 * graceful degradation rather than dropped content).
 */
export function planReceiptTiles(
  originalWidth:  number,
  originalHeight: number,
  options: TilePlanOptions = {},
): ReceiptTile[] {
  const { maxWidth, tileMaxHeight, overlapRatio, tallRatio, maxTiles } = {
    ...TILE_DEFAULTS,
    ...options,
  };

  // Downscale-only: never enlarge a small image.
  const targetWidth = Math.min(originalWidth, maxWidth);
  const scale        = targetWidth / originalWidth;
  const scaledHeight = Math.round(originalHeight * scale);
  const ratio        = scaledHeight / targetWidth;

  // Normal aspect → one tile covering the whole image.
  if (ratio <= tallRatio) {
    return [{
      sx: 0, sy: 0,
      sWidth: originalWidth, sHeight: originalHeight,
      dWidth: targetWidth,   dHeight: scaledHeight,
    }];
  }

  // How many tiles of tileMaxHeight (with overlap) it takes to cover the height.
  const step = tileMaxHeight * (1 - overlapRatio);
  let n = Math.ceil((scaledHeight - tileMaxHeight) / step) + 1;
  n = Math.max(2, Math.min(maxTiles, n));

  // Solve for the exact tile height so N tiles with `overlapRatio` overlap cover
  // the full height precisely: n*h - (n-1)*overlap*h = scaledHeight.
  const h        = scaledHeight / (n - (n - 1) * overlapRatio);
  const destStep = h * (1 - overlapRatio);

  const tiles: ReceiptTile[] = [];
  for (let i = 0; i < n; i++) {
    const destTop = Math.round(i * destStep);
    // Clamp the last tile to the bottom edge so coverage is exact.
    const destH   = i === n - 1
      ? scaledHeight - destTop
      : Math.round(h);

    const sy      = Math.round(destTop / scale);
    const sHeight = Math.min(Math.round(destH / scale), originalHeight - sy);

    tiles.push({
      sx: 0, sy,
      sWidth: originalWidth, sHeight,
      dWidth: targetWidth,   dHeight: Math.round(sHeight * scale),
    });
  }

  return tiles;
}
