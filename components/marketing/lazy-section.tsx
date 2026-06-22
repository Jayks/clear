"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// The import() lookup MUST live here, inside the Client Component, not be
// passed in as a prop function from AboutLanding (a Server Component) — RSC
// can only serialize plain data across that boundary, never function values
// (only "use server" Server Actions are allowed to cross as callable
// references). Passing `loader={() => import(...)}` from a Server Component
// throws "Functions cannot be passed directly to Client Components" at
// runtime (found 2026-06-22) — a string key is serializable, this isn't.
const LOADERS = {
  "trip-timeline":         () => import("./showcases/trip-timeline-showcase"),
  "recurring-templates":   () => import("./showcases/recurring-templates-showcase"),
  "streams":               () => import("./showcases/streams-showcase"),
  "circles":               () => import("./showcases/circles-showcase"),
  "ai-features":           () => import("./showcases/ai-features-showcase"),
  "notifications":         () => import("./showcases/notifications-showcase"),
  "social-layer":          () => import("./showcases/social-layer-showcase"),
  "map-view":              () => import("./showcases/map-view-showcase"),
  "settlement":            () => import("./showcases/settlement-showcase"),
  "debt-flow":             () => import("./showcases/debt-flow-showcase"),
  "insights":              () => import("./showcases/insights-showcase"),
  "why-clearoff":          () => import("./showcases/why-clearoff-showcase"),
} as const;

export type ShowcaseId = keyof typeof LOADERS;

interface LazySectionProps {
  sectionId: ShowcaseId;
  /** Reserved height while not yet mounted, so the page doesn't jump as content pops in. Pick something close to the section's real rendered height. */
  minHeight?: number;
  /** Anchor id, e.g. for a same-page `<a href="#why-clear">` CTA elsewhere on
   *  the page. Applied to the wrapper div, which is ALWAYS rendered (it's
   *  the IntersectionObserver target), never to the lazy content itself —
   *  so the anchor exists immediately, before `inView` flips true. A click
   *  scrolling to it is what makes the observer fire and mount the real
   *  content in the first place, same as an ordinary scroll would. */
  id?: string;
}

/**
 * Defers both the SSR payload AND the JS fetch for a heavy below-fold
 * section until it's about to scroll into view. `next/dynamic(loader,
 * { ssr: false })` strips the section from the server-rendered HTML
 * entirely (not just hides it client-side) — this is the part that
 * actually shrinks the initial response; AboutLanding measured at ~451KB
 * vs the carousel's ~67KB before this, almost entirely from 11 feature
 * showcases nobody sees without scrolling (2026-06-22 perf investigation).
 * The IntersectionObserver below additionally delays even STARTING that
 * fetch until the section is close to the viewport, rather than firing
 * for all 11 sections the instant the page hydrates.
 *
 * `ssr: false` can only be called from a Client Component boundary —
 * Next.js throws if it's used directly inside a Server Component. That's
 * the whole reason this wrapper exists: `AboutLanding` stays a plain
 * Server Component and just renders this normally, handing it a string
 * `sectionId` (NOT a loader function — see the LOADERS comment above).
 */
export function LazySection({ sectionId, minHeight = 560, id }: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  // useState initializer (not a plain dynamic() call in the render body) —
  // dynamic() must produce a STABLE component reference across re-renders,
  // or React would treat every render as a brand-new component type.
  const [Section] = useState(() => dynamic(LOADERS[sectionId], { ssr: false, loading: () => null }));

  useEffect(() => {
    if (inView || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" } // start fetching slightly before it's actually on screen
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [inView]);

  return (
    <div ref={ref} id={id} style={inView ? undefined : { minHeight }}>
      {inView && <Section />}
    </div>
  );
}
