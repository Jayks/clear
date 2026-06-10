// Shared brand components — the "B-Converge" mark (C + two inflow strokes
// converging into a split node) at any size. Mirrors app/icon.tsx.

const GRADIENT =
  "linear-gradient(140deg, #22D3EE 0%, #0BB6D4 42%, #0E8FA8 78%, #0B5E70 100%)";

/** Just the white SVG paths — use inside a custom coloured/glass container. */
export function ClearIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
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
      {/* faint halo behind the node */}
      <circle cx="77" cy="50" r="13" fill="white" fillOpacity="0.1" />
      {/* two inflow strokes (the L + r) converging into the node */}
      <path d="M96 37 Q88 44 80 49" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.95" />
      <path d="M96 63 Q88 56 80 51" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.95" />
      {/* split node — left half (e) bright, right half (a) dimmed, + highlight */}
      <path d="M76.2 41 A9 9 0 0 0 76.2 59 Z" fill="white" />
      <path d="M77.8 41 A9 9 0 0 1 77.8 59 Z" fill="white" fillOpacity="0.8" />
      <circle cx="74" cy="46.5" r="3.4" fill="white" fillOpacity="0.9" />
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

/** Gradient glass icon box + optional "Clear" wordmark. */
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
          Clear
        </span>
      )}
    </div>
  );
}
