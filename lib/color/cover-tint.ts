// Pure colour maths for the cover-photo ambient tint. The canvas pixel
// extraction lives in the client component (components/shared/cover-glow.tsx);
// these are the testable parts.

export interface Rgb { r: number; g: number; b: number }

/** Average RGB of an RGBA pixel buffer (Uint8ClampedArray, length = 4·n).
 *  Fully transparent pixels are ignored. Empty/all-transparent → black. */
export function averageColor(data: Uint8ClampedArray | number[]): Rgb {
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // skip fully transparent
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

/** Nudge a muted average toward a pleasant ambient accent: boost saturation
 *  (but never fabricate a hue out of near-grey), and clamp lightness into a mid
 *  band so the glow is neither murky-dark nor washed-out. Returns CSS `rgb(...)`. */
export function enhanceTint({ r, g, b }: Rgb): string {
  const [h, s, l] = rgbToHsl(r, g, b);
  const s2 = s < 0.05 ? s : Math.min(1, s * 1.4 + 0.12);
  const l2 = Math.min(0.68, Math.max(0.4, l));
  const [r2, g2, b2] = hslToRgb(h, s2, l2);
  return `rgb(${r2} ${g2} ${b2})`;
}

// ── colour-space helpers (h,s,l all in [0,1]) ────────────────────────────────

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}
