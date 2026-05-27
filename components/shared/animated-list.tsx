"use client";

import type React from "react";
import { useReducedMotion } from "framer-motion";

interface Props extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children: React.ReactNode[];
  staggerMs?: number;
  /** Extra base delay (ms) before the first item — lets split lists continue
   *  from where a preceding AnimatedList left off. */
  initialDelayMs?: number;
}

export function AnimatedList({ children, className, staggerMs = 80, initialDelayMs = 0, ...rest }: Props) {
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
        // Plain div + CSS keyframe animation instead of Framer Motion motion.div.
        // CSS animations fire on DOM insertion — no React hydration dependency —
        // so the entrance plays reliably after skeleton→content swaps on mobile.
        //
        // Delay is passed via CSS custom property --list-delay, read by
        // animation-delay in the .animate-list-enter rule. This is more reliable
        // than inline animationDelay which can conflict with the animation
        // shorthand's implicit delay:0s across different browsers.
        <div
          key={i}
          className="h-full animate-list-enter"
          style={{
            // Cap stagger at item 8 — items 9+ all animate at item-8 delay so a
            // long expense list never exceeds 640ms total stagger.
            "--list-delay": `${(initialDelayMs + Math.min(i, 8) * staggerMs) / 1000}s`,
          } as React.CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
