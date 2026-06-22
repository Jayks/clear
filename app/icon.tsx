import { ImageResponse } from "next/og";
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

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// ClearOff app icon — "B-Converge refined": a chamfered boxy C (= Clear) with
// inflow strokes converging into a node, resolving into a checkmark cut
// ("cleared off") instead of the old straight-seam split coin. C outline,
// inflow strokes, and the node disc are each duplicated through a diagonally
// offset, darkening stack to fake a 3D emboss — Satori can't do real lighting
// filters, so this is pure shape data instead. Glass material = darker base
// gradient + specular bloom + bottom vignette + white rim. Fine detail
// (the checkmark, the bevel) is expected to soften at this size — same as
// the old split-seam always did.
export default function Icon() {
  const layers = buildBevelLayers();
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: GLYPH_GRADIENT,
          overflow: "hidden",
        }}
      >
        {/* specular bloom (top-left) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(circle at 28% 16%, rgba(255,255,255,0.5), rgba(255,255,255,0.12) 30%, rgba(255,255,255,0) 62%)",
          }}
        />
        {/* bottom vignette for depth */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,16,24,0.34) 100%)",
          }}
        />
        {/* glass rim */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        />
        {/* glyph */}
        <svg width={22} height={22} viewBox="0 0 100 100">
          {/* faint halo (stands in for the glow Satori can't blur) */}
          <circle cx={NODE_CX} cy={NODE_CY} r={HALO_R} fill="white" fillOpacity="0.1" />
          {/* C outline + inflow strokes + node disc — 3D bevel stack */}
          {layers.map((l, i) => (
            <g key={i} transform={`translate(${l.dx},${l.dy})`}>
              <path d={PATH_C} fill="none" stroke={l.color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="miter" strokeOpacity={l.isFront ? 0.97 : 1} />
              <path d={INFLOW_1} fill="none" stroke={l.color} strokeWidth="5" strokeLinecap="round" strokeOpacity={l.isFront ? 0.95 : 1} />
              <path d={INFLOW_2} fill="none" stroke={l.color} strokeWidth="5" strokeLinecap="round" strokeOpacity={l.isFront ? 0.95 : 1} />
              <circle cx={NODE_CX} cy={NODE_CY} r={NODE_R} fill={l.color} />
            </g>
          ))}
          {/* checkmark cut into the node — "cleared off" */}
          <path d={CHECK_PATH} fill="none" stroke={GLYPH_DARK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* gloss highlight */}
          <circle cx={HIGHLIGHT.cx} cy={HIGHLIGHT.cy} r={HIGHLIGHT.r} fill="white" fillOpacity="0.9" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
