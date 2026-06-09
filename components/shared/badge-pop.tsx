"use client";

/**
 * BadgePop — wraps a section header icon badge and animates it in on mount.
 * Client component so the animation fires AFTER paint (not during SSR parse),
 * making it visible regardless of how fast the page loads.
 */

import { motion } from "framer-motion";

interface Props {
  className: string;
  children: React.ReactNode;
}

export function BadgePop({ className, children }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.05 }}
    >
      {children}
    </motion.div>
  );
}
