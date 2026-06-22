// Pure geometry + colour math for the ClearOff brand glyph — the chamfered C
// with two inflow strokes converging into a node, now resolving into a
// checkmark cut ("cleared off") instead of the old straight-seam split coin.
//
// Shared by every surface that renders the mark: components/shared/clear-logo.tsx
// (canonical, browser SVG), app/icon.tsx (favicon), app/api/pwa-icon/route.ts
// (PWA/apple-touch), app/api/settle-card/route.ts, app/pay/opengraph-image.tsx,
// app/summary/[token]/opengraph-image.tsx.
//
// Pure data/math only — no JSX, no React — safe to import from every runtime
// (browser, Node, Edge/Satori) without coupling them to one render style.
// Satori can't do CSS/SVG filters or blur, so the "3D" emboss below is done
// as plain duplicate shapes (diagonally offset, darkened toward the back
// layer) rather than a lighting filter — renders identically everywhere.

export const GLYPH_GRADIENT =
  "linear-gradient(140deg, #129DB8 0%, #07788C 42%, #08596A 78%, #062F38 100%)";

/** Gradient's darkest stop — reused as the bevel shadow colour AND the checkmark's "cut" colour (the surface peeking through). */
export const GLYPH_DARK = "#062F38";

// Node pulled in from the C's lip tips (x=73) so the C visibly cups it rather
// than just brushing its edge. Free to do geometrically — at this height the
// C's interior is hollow all the way to the back wall; the lips only have
// stroke material up near y=18-32 / y=68-82, nowhere near the node (y=50).
const NODE_SHIFT = 5;
export const NODE_CX = 77 - NODE_SHIFT;
export const NODE_CY = 50;
export const NODE_R = 9;
export const HALO_R = 13;

export const PATH_C = "M73 25 L66 18 L32 18 L18 32 L18 68 L32 82 L66 82 L73 75";

const inflowEndX = 80 - NODE_SHIFT;
export const INFLOW_1 = `M96 37 Q88 44 ${inflowEndX} 49`;
export const INFLOW_2 = `M96 63 Q88 56 ${inflowEndX} 51`;

/** Checkmark cut into the node disc, centred on it — drawn once on top, not part of the bevel stack (it's a flat reveal, not 3D geometry). */
export const CHECK_PATH = `M${NODE_CX - 4} 50 L${NODE_CX - 1.5} 53 L${NODE_CX + 4.5} 45`;

/** Small gloss highlight on the disc, tucked away from the checkmark. */
export const HIGHLIGHT = { cx: NODE_CX - 3.8, cy: 46, r: 2.1 };

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
      .join("")
  );
}
function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export interface BevelLayer {
  dx: number;
  dy: number;
  color: string;
  /** The final, topmost layer — original opacities apply here; every layer behind it is fully opaque. */
  isFront: boolean;
}

/**
 * Faked-extrusion "3D" stack for the C outline, the two inflow strokes, and
 * the node disc: `layers + 1` duplicate copies, offset diagonally and
 * darkening from `darkHex` toward white as they approach the front. Pure
 * shape data — renders identically in a real `<svg>` and inside Satori.
 */
export function buildBevelLayers(layers = 5, maxOffset = 1.4, darkHex: string = GLYPH_DARK): BevelLayer[] {
  const out: BevelLayer[] = [];
  for (let i = layers; i >= 0; i--) {
    const t = i / layers;
    out.push({
      dx: maxOffset * t,
      dy: maxOffset * t * 1.3,
      color: lerpColor("#ffffff", darkHex, t),
      isFront: i === 0,
    });
  }
  return out;
}
