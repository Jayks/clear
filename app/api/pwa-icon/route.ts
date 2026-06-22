import React from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
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

export const runtime = "edge";

// ClearOff PWA / apple-touch icon — "B-Converge refined".
// See app/icon.tsx for the design rationale. Same glyph, scaled for 192 / 512.
export function GET(request: NextRequest) {
  const sizeParam = parseInt(request.nextUrl.searchParams.get("size") ?? "192");
  const size = [192, 512].includes(sizeParam) ? sizeParam : 192;
  const radius = Math.round(size * 0.22);
  const svgSize = Math.round(size * 0.68);
  const rim = Math.max(1, Math.round(size * 0.006));

  const overlay = (background: string, extra: React.CSSProperties = {}) =>
    React.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background,
        ...extra,
      },
    });

  const layers = buildBevelLayers();
  const glyphChildren = [
    // faint halo (stands in for the glow Satori can't blur)
    React.createElement("circle", { key: "halo", cx: NODE_CX, cy: NODE_CY, r: HALO_R, fill: "white", fillOpacity: "0.1" }),
    // C outline + inflow strokes + node disc — 3D bevel stack
    ...layers.map((l, i) =>
      React.createElement(
        "g",
        { key: `layer-${i}`, transform: `translate(${l.dx},${l.dy})` },
        React.createElement("path", { d: PATH_C, fill: "none", stroke: l.color, strokeWidth: "10", strokeLinecap: "round", strokeLinejoin: "miter", strokeOpacity: l.isFront ? "0.97" : "1" }),
        React.createElement("path", { d: INFLOW_1, fill: "none", stroke: l.color, strokeWidth: "5", strokeLinecap: "round", strokeOpacity: l.isFront ? "0.95" : "1" }),
        React.createElement("path", { d: INFLOW_2, fill: "none", stroke: l.color, strokeWidth: "5", strokeLinecap: "round", strokeOpacity: l.isFront ? "0.95" : "1" }),
        React.createElement("circle", { cx: NODE_CX, cy: NODE_CY, r: NODE_R, fill: l.color })
      )
    ),
    // checkmark cut into the node — "cleared off"
    React.createElement("path", { key: "check", d: CHECK_PATH, fill: "none", stroke: GLYPH_DARK, strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }),
    // gloss highlight
    React.createElement("circle", { key: "highlight", cx: HIGHLIGHT.cx, cy: HIGHLIGHT.cy, r: HIGHLIGHT.r, fill: "white", fillOpacity: "0.9" }),
  ];

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: size,
          height: size,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
          background: GLYPH_GRADIENT,
          overflow: "hidden",
        },
      },
      // specular bloom (top-left)
      overlay(
        "radial-gradient(circle at 28% 16%, rgba(255,255,255,0.5), rgba(255,255,255,0.12) 30%, rgba(255,255,255,0) 62%)"
      ),
      // bottom vignette for depth
      overlay(
        "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,16,24,0.34) 100%)"
      ),
      // glass rim
      React.createElement("div", {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius: radius,
          border: `${rim}px solid rgba(255,255,255,0.22)`,
        },
      }),
      // glyph
      React.createElement(
        "svg",
        { width: svgSize, height: svgSize, viewBox: "0 0 100 100" },
        ...glyphChildren
      )
    ),
    { width: size, height: size }
  );
}
