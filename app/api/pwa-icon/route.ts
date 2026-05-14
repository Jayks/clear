import React from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export function GET(request: NextRequest) {
  const sizeParam = parseInt(request.nextUrl.searchParams.get("size") ?? "192");
  const size = [192, 512].includes(sizeParam) ? sizeParam : 192;
  const radius = Math.round(size * 0.22);
  const svgSize = Math.round(size * 0.68);

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: size,
          height: size,
          borderRadius: radius,
          background: "linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(
        "svg",
        { width: svgSize, height: svgSize, viewBox: "0 0 100 100" },

        // C arc — r=36, 270° arc opening to the right (gap ±45° from 3-o'clock)
        // Arc goes clockwise from bottom-right (45°) to top-right (315°), enclosing the coin
        React.createElement("path", {
          d: "M 75 75 A 36 36 0 1 1 75 25",
          fill: "none",
          stroke: "white",
          strokeWidth: "10",
          strokeLinecap: "round",
          strokeOpacity: "0.97",
        }),

        // Left coin half — center (47,50) r=15, flat edge on right faces the split gap
        React.createElement("path", {
          d: "M 47 35 A 15 15 0 0 0 47 65 Z",
          fill: "white",
          fillOpacity: "0.88",
        }),

        // Right coin half — center (53,50) r=15, flat edge on left faces the split gap
        React.createElement("path", {
          d: "M 53 35 A 15 15 0 0 1 53 65 Z",
          fill: "white",
          fillOpacity: "0.88",
        }),

        // Split dots in the gap between the two coin halves
        React.createElement("circle", { cx: "50", cy: "42", r: "2.2", fill: "white", fillOpacity: "0.4" }),
        React.createElement("circle", { cx: "50", cy: "50", r: "2.2", fill: "white", fillOpacity: "0.4" }),
        React.createElement("circle", { cx: "50", cy: "58", r: "2.2", fill: "white", fillOpacity: "0.4" }),
      )
    ),
    { width: size, height: size }
  );
}
