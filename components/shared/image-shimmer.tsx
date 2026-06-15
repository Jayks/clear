// Loading placeholder shown behind cover photos. A sweeping highlight reads as
// an intentional "loading" state; the opaque cover JPEG paints over it once
// decoded, so no JS/onLoad wiring is needed — this works inside RSC (group hero)
// and client cards (TripCard / CircleCard) alike. Respects reduced-motion (the
// sweep is disabled via globals.css; the muted base colour remains).
export function ImageShimmer({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 cover-shimmer pointer-events-none ${className}`} />
  );
}
