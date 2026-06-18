/**
 * CardRibbon — the diagonal corner ribbon on home cards. Glassy/translucent so
 * the card's photo + details still read through it. Shared by TripCard and
 * CircleCard so "SAMPLE" / "ARCHIVED" / "LOCKED" look identical everywhere.
 *
 * Render inside the card's inner `overflow-hidden` wrapper (so it clips to the
 * rounded corner and spans image + badges).
 */
export function CardRibbon({ variant }: { variant: "sample" | "archived" | "locked" }) {
  const bg = variant === "sample" ? "bg-amber-500/25" : variant === "locked" ? "bg-violet-500/30" : "bg-slate-500/30";
  const label = variant === "sample" ? "SAMPLE" : variant === "locked" ? "LOCKED" : "ARCHIVED";
  return (
    <div
      className={`absolute bottom-[22px] right-[-30px] w-[130px] rotate-[-45deg]
                  backdrop-blur-[1px] border-y border-white/40
                  text-white text-[10px] font-bold py-1.5 text-center tracking-widest
                  pointer-events-none z-20
                  [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]
                  ${bg}`}
    >
      {label}
    </div>
  );
}
