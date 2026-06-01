"use client";

/**
 * PageTransition — wraps page content in a motion.div keyed to the pathname.
 * On every route change React mounts a fresh node (new key), triggering the
 * entry animation. No exit animation intentionally — exits would make
 * navigation feel sluggish.
 */

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      // Inherit the flex column layout so children fill the container correctly
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
