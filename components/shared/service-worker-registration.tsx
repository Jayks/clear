"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register ONLY in production. In dev the SW is a footgun: its network-first
    // navigation handler (public/sw.js) serves whole HTML documents that can
    // reference a *previous* Turbopack build's hashed JS chunks after a rebuild
    // or dev-server restart. The mismatched chunk 404s, React hydration throws
    // and aborts, and the page comes back half-dead — visible top, but
    // FadeIn-wrapped sections stuck at opacity:0 and nav buttons with no
    // click handlers (root-caused 2026-06-22: "back from Google OAuth → nothing
    // loads past the ticker, Sign in/Get started do nothing"). Most reliably
    // triggered by the OAuth-redirect-and-back navigation, which re-fetches the
    // document through the SW rather than serving a single consistent set.
    if (process.env.NODE_ENV !== "production") {
      // Tear down any SW left registered from a prior prod-like test or earlier
      // dev session so it stops controlling this origin and serving stale chunks.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        const hadController = !!navigator.serviceWorker.controller;
        Promise.all(regs.map((r) => r.unregister())).then(() => {
          // The active SW keeps controlling the CURRENT page until it's gone;
          // one reload escapes it. Guarded by `hadController` so this fires at
          // most once — after the reload there's no controller, so no loop.
          if (hadController) window.location.reload();
        });
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
