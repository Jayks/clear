import React from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export function GET(request: NextRequest) {
  const sizeParam = parseInt(request.nextUrl.searchParams.get("size") ?? "192");
  const size = [192, 512].includes(sizeParam) ? sizeParam : 192;
  const fontSize = Math.round(size * 0.46);
  const radius = Math.round(size * 0.22);

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: size,
          height: size,
          borderRadius: radius,
          background: "linear-gradient(135deg, #06B6D4, #14B8A6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize,
          fontWeight: 800,
          color: "white",
          letterSpacing: "-4px",
        },
      },
      "C"
    ),
    { width: size, height: size }
  );
}
