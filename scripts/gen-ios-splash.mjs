// Generates iOS PWA launch (splash) images: the new ClearOff B-Converge glyph
// centred on the manifest background colour, one PNG per common iPhone screen
// resolution. iOS only honours an apple-touch-startup-image whose dimensions
// EXACTLY match the device, so we emit the full device matrix.
//
// Run: node scripts/gen-ios-splash.mjs   (regenerate if the glyph changes)
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// --- glyph geometry (mirrors lib/brand-glyph.ts; kept inline so this script
// has no TS-import dependency) ---
const GLYPH_DARK = "#062F38";
const NODE_SHIFT = 5;
const NODE_CX = 77 - NODE_SHIFT;
const NODE_CY = 50;
const NODE_R = 9;
const HALO_R = 13;
const PATH_C = "M73 25 L66 18 L32 18 L18 32 L18 68 L32 82 L66 82 L73 75";
const inflowEndX = 80 - NODE_SHIFT;
const INFLOW_1 = `M96 37 Q88 44 ${inflowEndX} 49`;
const INFLOW_2 = `M96 63 Q88 56 ${inflowEndX} 51`;
const CHECK_PATH = `M${NODE_CX - 4} 50 L${NODE_CX - 1.5} 53 L${NODE_CX + 4.5} 45`;
const HIGHLIGHT = { cx: NODE_CX - 3.8, cy: 46, r: 2.1 };

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function lerp(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
function bevelLayers(layers = 5, maxOffset = 1.4) {
  const out = [];
  for (let i = layers; i >= 0; i--) {
    const t = i / layers;
    out.push({ dx: maxOffset * t, dy: maxOffset * t * 1.3, color: lerp("#ffffff", GLYPH_DARK, t), isFront: i === 0 });
  }
  return out;
}

// A rounded-square icon tile (gradient + glyph), as a standalone SVG string.
function iconSvg(px) {
  const r = Math.round(px * 0.22);
  const layers = bevelLayers()
    .map(
      (l) => `<g transform="translate(${l.dx},${l.dy})">
        <path d="${PATH_C}" fill="none" stroke="${l.color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="miter" stroke-opacity="${l.isFront ? 0.97 : 1}"/>
        <path d="${INFLOW_1}" fill="none" stroke="${l.color}" stroke-width="5" stroke-linecap="round" stroke-opacity="${l.isFront ? 0.95 : 1}"/>
        <path d="${INFLOW_2}" fill="none" stroke="${l.color}" stroke-width="5" stroke-linecap="round" stroke-opacity="${l.isFront ? 0.95 : 1}"/>
        <circle cx="${NODE_CX}" cy="${NODE_CY}" r="${NODE_R}" fill="${l.color}"/>
      </g>`
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#129DB8"/><stop offset="0.42" stop-color="#07788C"/>
        <stop offset="0.78" stop-color="#08596A"/><stop offset="1" stop-color="#062F38"/>
      </linearGradient>
      <radialGradient id="bloom" cx="0.28" cy="0.16" r="0.6">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/>
        <stop offset="0.3" stop-color="#ffffff" stop-opacity="0.12"/>
        <stop offset="0.62" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${px}" height="${px}" rx="${r}" fill="url(#g)"/>
    <rect width="${px}" height="${px}" rx="${r}" fill="url(#bloom)"/>
    <g transform="translate(${px * 0.16},${px * 0.16}) scale(${(px * 0.68) / 100})">
      <circle cx="${NODE_CX}" cy="${NODE_CY}" r="${HALO_R}" fill="white" fill-opacity="0.1"/>
      ${layers}
      <path d="${CHECK_PATH}" fill="none" stroke="${GLYPH_DARK}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${HIGHLIGHT.cx}" cy="${HIGHLIGHT.cy}" r="${HIGHLIGHT.r}" fill="white" fill-opacity="0.9"/>
    </g>
    <rect width="${px}" height="${px}" rx="${r}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="${Math.max(1, px * 0.006)}"/>
  </svg>`;
}

const BG = "#EFF6FF"; // manifest background_color

// [logical width, logical height, dpr] — portrait. Covers SE1 → 16 Pro Max.
const DEVICES = [
  [320, 568, 2], [375, 667, 2], [414, 736, 3], [375, 812, 3],
  [414, 896, 2], [414, 896, 3], [390, 844, 3], [428, 926, 3],
  [393, 852, 3], [430, 932, 3], [402, 874, 3],
];

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "splash");
mkdirSync(outDir, { recursive: true });

const links = [];
for (const [w, h, dpr] of DEVICES) {
  const pw = w * dpr;
  const ph = h * dpr;
  const iconPx = Math.round(Math.min(pw, ph) * 0.32);
  const icon = await sharp(Buffer.from(iconSvg(iconPx))).png().toBuffer();
  const file = `apple-splash-${pw}x${ph}.png`;
  await sharp({ create: { width: pw, height: ph, channels: 4, background: BG } })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toFile(join(outDir, file));
  links.push(
    `  { media: "(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)", href: "/splash/${file}" },`
  );
  console.log("wrote", file);
}

// Emit the link-tag data array for the React component.
writeFileSync(join(outDir, "_links.txt"), links.join("\n"));
console.log("\nLink data written to public/splash/_links.txt");
