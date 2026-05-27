"use client";

import type React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children: React.ReactNode[];
  staggerMs?: number;
  /** Extra base delay (ms) before the first item — lets split lists continue
   *  from where a preceding AnimatedList left off. */
  initialDelayMs?: number;
}

export function AnimatedList({ children, className, staggerMs = 40, initialDelayMs = 0, ...rest }: Props) {
  const reduced = useReducedMotion();

  // If the user prefers reduced motion, render items immediately with no
  // animation — avoids the opacity:0 initial state going unresolved.
  if (reduced) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div className={className} {...rest}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          // Cap stagger at item 8 — items 9+ share the same delay so a long
          // expense list doesn't keep animating for seconds.
          transition={{
            duration: 0.2,
            delay: (initialDelayMs + Math.min(i, 8) * staggerMs) / 1000,
            ease: "easeOut",
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
