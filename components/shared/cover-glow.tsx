"use client";

import { useEffect, useState } from "react";
import { averageColor, enhanceTint } from "@/lib/color/cover-tint";

// Subtle ambient bloom behind the group hero, tinted by the cover photo's
// average colour ("now-playing" style). Decorative only — extracted client-side
// from the already-loaded image, so there's no schema/pipeline change and it
// works for every group (existing + new). If the image taints the canvas
// (cross-origin without CORS headers) we render nothing. Place inside a
// `relative` wrapper that sits OUTSIDE the hero card's overflow-hidden box.
export function CoverGlow({ src }: { src: string }) {
  const [tint, setTint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 16;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        setTint(enhanceTint(averageColor(data)));
      } catch {
        // Cross-origin image without CORS headers tainted the canvas — skip.
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);

  if (!tint) return null;

  return (
    // Sits behind the hero card and is larger than it, so a soft tinted halo
    // bleeds out the (unoccluded) edges + glows through the frosted lower strip.
    // Biased vertical (top/bottom) to avoid any horizontal page overflow.
    <>
      {/* Top flow — soft + low opacity: a vertical gradient that extends up past
          the card so the colour flows in from above with no hard edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 left-0 right-0 h-40 blur-2xl opacity-55 dark:opacity-60"
        style={{ background: `linear-gradient(to bottom, ${tint}, transparent 75%)` }}
      />
      {/* Side glow — sharper + stronger: a horizontal gradient tinted at both
          edges (transparent middle), so it bleeds out the two sides only. The
          opaque photo hides the centre; ends near the photo bottom (no bottom glow). */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1 -left-6 -right-6 h-48 blur-xl opacity-90"
        style={{ background: `linear-gradient(to right, ${tint} 0%, transparent 24%, transparent 76%, ${tint} 100%)` }}
      />
    </>
  );
}
