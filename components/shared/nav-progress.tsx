"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function NavProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Navigation complete — hide the bar
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  // Any internal link click — show bar immediately
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const a = (e.target as Element).closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href === pathname) return;
      setLoading(true);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [pathname]);

  // Programmatic navigations (e.g. window.location.href for cross-layout routes)
  // dispatch this event so the bar still starts before the page unloads.
  useEffect(() => {
    const handler = () => setLoading(true);
    window.addEventListener("navprogress", handler);
    return () => window.removeEventListener("navprogress", handler);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-0.5 z-[9999] bg-gradient-to-r from-cyan-500 to-teal-500 origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.85, transition: { duration: 1.5, ease: "easeOut" } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.2 } }}
        />
      )}
    </AnimatePresence>
  );
}
