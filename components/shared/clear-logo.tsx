// Shared brand components — the C-arc + split-coin mark at any size.

const GRADIENT = "linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)";

/** Just the white SVG paths — use inside a custom coloured/glass container. */
export function ClearIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {/* C arc — 270° opening to the right */}
      <path
        d="M 75 75 A 36 36 0 1 1 75 25"
        fill="none"
        stroke="white"
        strokeWidth="10"
        strokeLinecap="round"
        strokeOpacity="0.97"
      />
      {/* Left coin half */}
      <path d="M 47 35 A 15 15 0 0 0 47 65 Z" fill="white" fillOpacity="0.88" />
      {/* Right coin half */}
      <path d="M 53 35 A 15 15 0 0 1 53 65 Z" fill="white" fillOpacity="0.88" />
      {/* Split dots */}
      <circle cx="50" cy="42" r="1.8" fill="white" fillOpacity="0.4" />
      <circle cx="50" cy="50" r="1.8" fill="white" fillOpacity="0.4" />
      <circle cx="50" cy="58" r="1.8" fill="white" fillOpacity="0.4" />
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

/** Gradient icon box + optional "Clear" wordmark. */
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
        style={{ width: iconSize, height: iconSize, borderRadius: radius, background: GRADIENT }}
        className="flex items-center justify-center shrink-0 shadow-sm shadow-cyan-500/30"
      >
        <ClearIcon size={svgSize} />
      </div>
      {showWordmark && (
        <span className={wordmarkClassName} style={{ fontFamily: "var(--font-fraunces)" }}>
          Clear
        </span>
      )}
    </div>
  );
}
