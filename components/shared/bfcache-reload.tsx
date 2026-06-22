"use client";

import { useEffect } from "react";

/**
 * Forces a clean reload when the browser restores this page from its
 * back-forward cache (bfcache) — e.g. clicking "Continue with Google" in
 * LoginModal does a full cross-origin redirect to accounts.google.com, and
 * pressing the browser's back button restores the ClearOff page from a
 * frozen snapshot rather than re-running its load sequence. React's event
 * handling can come back in a broken state after that (found 2026-06-22:
 * "after Google OAuth back-button, Sign in/Get started do nothing — the
 * modal doesn't pop up"). The `pageshow` event's `persisted` flag is true
 * only for a genuine bfcache restore (full/cross-origin navigation away and
 * back) — normal in-app client-side navigation never unloads the document,
 * so this never fires for ordinary back/forward within the app.
 */
export function BfcacheReload() {
  useEffect(() => {
    // Production only. In dev this is actively harmful: a bfcache restore brings
    // the page back FULLY HYDRATED and instant (React's live heap is frozen then
    // thawed — buttons work, content is visible immediately). Forcing a reload
    // here throws that perfect snapshot away and re-hydrates this heavy landing
    // page from scratch, which in dev takes many seconds of unminified on-demand
    // compilation — showing blank-below-the-ticker + dead buttons the whole time
    // (the exact "OAuth back-button is broken" symptom chased for hours on
    // 2026-06-22, which turned out to be dev hydration latency, never a prod
    // bug). In prod the forced reload is sub-second and seamless, so the safety
    // net stays there; in dev we let the browser's instant bfcache restore stand.
    if (process.env.NODE_ENV !== "production") return;

    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        // Reload WITHOUT the hash, not window.location.reload() — a hash in
        // the URL (e.g. "#why-clear" from the hero's "Why ClearOff?" anchor
        // link, still present from before the OAuth round-trip) makes the
        // browser jump straight to that section as part of the reload itself,
        // never triggering a normal user-scroll. Sections below the fold are
        // wrapped in FadeIn (opacity:0 until Framer Motion's useInView fires
        // on scroll-into-view) — landing on one via a hash-jump instead of an
        // actual scroll left it stuck invisible, reading as "the page is
        // blank" (reported 2026-06-22). Dropping the hash lands back at the
        // top instead — loses the exact scroll position, which is an
        // acceptable cost for the same reason the reload itself is: this is
        // an already-rare OAuth-redirect-and-back edge case, not a hot path.
        window.location.href = window.location.pathname + window.location.search;
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
