"use client";

/**
 * PageTransition — re-triggers a fade+slide entry animation on every route
 * change. No exit animation intentionally — exits would make navigation feel
 * sluggish.
 *
 * Does NOT key the wrapper on pathname (the original implementation did —
 * `key={pathname}` on the element directly containing `{children}`). That
 * forced React to fully unmount/remount EVERYTHING below this wrapper on
 * every single navigation, app-wide — including sibling-route layouts
 * (e.g. app/(app)/groups/[id]/layout.tsx) that Next.js's App Router is
 * specifically designed to persist across navigations within the same
 * layout (that's the whole point of layouts: GroupMobileNav/GroupDesktopNav/
 * RealtimeRefresh shouldn't remount just because the leaf page changed).
 * Forcing that remount from above defeats Next.js's own layout-persistence
 * and Suspense-boundary scoping — confirmed as the cause of a real bug: an
 * add-expense save + router.back() landing on the group overview page would
 * sometimes flash the Home page's loading skeleton instead of the overview
 * page's own one. Using `useAnimation` + a pathname-watching effect gets the
 * same visible fade+slide on every route change without remounting anything;
 * actual page content still swaps normally via React's regular reconciliation
 * (different page.tsx = different component type at that tree position).
 */

import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const controls = useAnimation();

  useEffect(() => {
    controls.set({ opacity: 0, y: 7 });
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] },
    });
  }, [pathname, controls]);

  return (
    // Inherit the flex column layout so children fill the container correctly
    <motion.div animate={controls} className="flex-1 flex flex-col">
      {children}
    </motion.div>
  );
}
