// Shared brand components — the "B-Converge" mark (C + two inflow strokes
// converging into a node, resolving into a checkmark — "cleared off") at any
// size. Mirrors app/icon.tsx. Geometry/colour lives in lib/brand-glyph.ts —
// shared with every other surface that inlines this glyph.

import { BRAND } from "@/lib/brand";
import {
  GLYPH_GRADIENT,
  GLYPH_DARK,
  PATH_C,
  INFLOW_1,
  INFLOW_2,
  NODE_CX,
  NODE_CY,
  NODE_R,
  HALO_R,
  CHECK_PATH,
  HIGHLIGHT,
  buildBevelLayers,
} from "@/lib/brand-glyph";

const GRADIENT = GLYPH_GRADIENT;

/** Just the white SVG paths — use inside a custom coloured/glass container. */
export function ClearIcon({ size }: { size: number }) {
  const layers = buildBevelLayers();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {/* faint halo behind the node */}
      <circle cx={NODE_CX} cy={NODE_CY} r={HALO_R} fill="white" fillOpacity="0.1" />
      {/* C outline + two inflow strokes (the L + r) + node disc — each duplicated
          through a diagonally-offset, darkening stack to fake a 3D emboss
          (Satori can't do real lighting filters, so this has to be pure shapes). */}
      {layers.map((l, i) => (
        <g key={i} transform={`translate(${l.dx},${l.dy})`}>
          <path d={PATH_C} fill="none" stroke={l.color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="miter" strokeOpacity={l.isFront ? 0.97 : 1} />
          <path d={INFLOW_1} fill="none" stroke={l.color} strokeWidth="5" strokeLinecap="round" strokeOpacity={l.isFront ? 0.95 : 1} />
          <path d={INFLOW_2} fill="none" stroke={l.color} strokeWidth="5" strokeLinecap="round" strokeOpacity={l.isFront ? 0.95 : 1} />
          <circle cx={NODE_CX} cy={NODE_CY} r={NODE_R} fill={l.color} />
        </g>
      ))}
      {/* checkmark cut into the node — "cleared off" — a flat reveal of the
          dark surface beneath, not part of the depth stack */}
      <path d={CHECK_PATH} fill="none" stroke={GLYPH_DARK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* gloss highlight */}
      <circle cx={HIGHLIGHT.cx} cy={HIGHLIGHT.cy} r={HIGHLIGHT.r} fill="white" fillOpacity="0.9" />
    </svg>
  );
}

interface LogoProps {
  /** Icon box size in px */
  iconSize?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
}

/** Gradient glass icon box + optional "Clear[Off]" wordmark (two-tone). */
export function ClearLogo({
  iconSize = 28,
  showWordmark = true,
  wordmarkClassName = "text-xl text-slate-800 dark:text-slate-100",
  className = "flex items-center gap-2",
}: LogoProps) {
  const radius = Math.round(iconSize * 0.27);
  const svgSize = Math.round(iconSize * 0.72);

  return (
    <div className={className}>
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: radius,
          background: GRADIENT,
          position: "relative",
          overflow: "hidden",
        }}
        className="flex items-center justify-center shrink-0 shadow-sm shadow-cyan-500/30"
      >
        {/* specular bloom (top-left) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 28% 16%, rgba(255,255,255,0.5), rgba(255,255,255,0.12) 30%, rgba(255,255,255,0) 62%)",
          }}
        />
        {/* glass rim */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        />
        <div style={{ position: "relative", display: "flex" }}>
          <ClearIcon size={svgSize} />
        </div>
      </div>
      {showWordmark && (
        <span className={wordmarkClassName} style={{ fontFamily: "var(--font-fraunces)" }}>
          {BRAND.namePrefix}
          <span className="text-cyan-600 dark:text-cyan-400">{BRAND.nameAccent}</span>
        </span>
      )}
    </div>
  );
}
