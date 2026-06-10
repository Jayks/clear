import React from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Clear PWA / apple-touch icon — "B-Converge refined".
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
          background:
            "linear-gradient(140deg, #22D3EE 0%, #0BB6D4 42%, #0E8FA8 78%, #0B5E70 100%)",
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

        // chamfered C — flat left side + 45° cut corners + 45° lips cupping the node
        React.createElement("path", {
          d: "M73 25 L66 18 L32 18 L18 32 L18 68 L32 82 L66 82 L73 75",
          fill: "none",
          stroke: "white",
          strokeWidth: "10",
          strokeLinecap: "round",
          strokeLinejoin: "miter",
          strokeOpacity: "0.97",
        }),

        // faint halo (stands in for the glow Satori can't blur)
        React.createElement("circle", { cx: "77", cy: "50", r: "13", fill: "white", fillOpacity: "0.1" }),

        // two inflow strokes (the L + r) — tuck under the node disc
        React.createElement("path", { d: "M96 37 Q88 44 80 49", fill: "none", stroke: "white", strokeWidth: "5", strokeLinecap: "round", strokeOpacity: "0.95" }),
        React.createElement("path", { d: "M96 63 Q88 56 80 51", fill: "none", stroke: "white", strokeWidth: "5", strokeLinecap: "round", strokeOpacity: "0.95" }),

        // split node — left half (e) bright, right half (a) dimmed, plus highlight
        React.createElement("path", { d: "M76.2 41 A9 9 0 0 0 76.2 59 Z", fill: "white" }),
        React.createElement("path", { d: "M77.8 41 A9 9 0 0 1 77.8 59 Z", fill: "white", fillOpacity: "0.8" }),
        React.createElement("circle", { cx: "74", cy: "46.5", r: "3.4", fill: "white", fillOpacity: "0.9" })
      )
    ),
    { width: size, height: size }
  );
}
