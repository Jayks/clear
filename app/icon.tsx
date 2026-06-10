import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Clear app icon — "B-Converge refined":
// a chamfered boxy C (= Clear) — flat left side, 45° cut corners, 45° lips
// cupping the node — with inflow strokes converging into a split node.
// The node's two halves (one bright, one dimmed) hide the "e + a" of Clear and
// echo the retired split-coin. Glass material = base gradient + specular bloom
// + bottom vignette + white rim. The seam intentionally vanishes at this size.
export default function Icon() {
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
          background:
            "linear-gradient(140deg, #22D3EE 0%, #0BB6D4 42%, #0E8FA8 78%, #0B5E70 100%)",
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
          {/* chamfered C — flat left side + 45° cut corners + 45° lips cupping the node */}
          <path
            d="M73 25 L66 18 L32 18 L18 32 L18 68 L32 82 L66 82 L73 75"
            fill="none"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="miter"
            strokeOpacity="0.97"
          />
          {/* faint halo (stands in for the glow Satori can't blur) */}
          <circle cx="77" cy="50" r="13" fill="white" fillOpacity="0.1" />
          {/* two inflow strokes (the L + r) — tuck under the node disc */}
          <path d="M96 37 Q88 44 80 49" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.95" />
          <path d="M96 63 Q88 56 80 51" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.95" />
          {/* split node — left half (e) bright, right half (a) dimmed, + highlight */}
          <path d="M76.2 41 A9 9 0 0 0 76.2 59 Z" fill="white" />
          <path d="M77.8 41 A9 9 0 0 1 77.8 59 Z" fill="white" fillOpacity="0.8" />
          <circle cx="74" cy="46.5" r="3.4" fill="white" fillOpacity="0.9" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
