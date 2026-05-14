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
          background: "linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={23} height={23} viewBox="0 0 100 100">
          {/* C arc — r=36, 270° arc opening to the right, gap ±45° from right */}
          <path
            d="M 75 75 A 36 36 0 1 1 75 25"
            fill="none"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            strokeOpacity="0.97"
          />
          {/* Left coin half — center (47,50) r=15, flat edge faces the gap */}
          <path
            d="M 47 35 A 15 15 0 0 0 47 65 Z"
            fill="white"
            fillOpacity="0.88"
          />
          {/* Right coin half — center (53,50) r=15, flat edge faces the gap */}
          <path
            d="M 53 35 A 15 15 0 0 1 53 65 Z"
            fill="white"
            fillOpacity="0.88"
          />
          {/* Split dots in the gap between halves */}
          <circle cx="50" cy="42" r="1.8" fill="white" fillOpacity="0.4" />
          <circle cx="50" cy="50" r="1.8" fill="white" fillOpacity="0.4" />
          <circle cx="50" cy="58" r="1.8" fill="white" fillOpacity="0.4" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
