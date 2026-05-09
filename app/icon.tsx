import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#FFFDF8",
          border: "1.5px solid #E8DDC9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 800,
          color: "#C97B5C",
          letterSpacing: "-0.5px",
        }}
      >
        W
      </div>
    ),
    { ...size }
  );
}
