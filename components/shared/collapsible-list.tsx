"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Like `AnimatedList`, but rows **resolve** instead of vanishing: when a child
 * is removed from the list (e.g. an optimistic `removedIds` delete or a settled
 * row after `router.refresh()`), it collapses (height→0 + fade) via
 * `AnimatePresence`, and its siblings slide up to fill the gap (`layout`).
 * New rows fade/slide in with a small stagger — same feel as `AnimatedList`.
 *
 * Drop-in compatible with `AnimatedList`'s props (`className`, `staggerMs`,
 * `initialDelayMs`). Each child MUST carry a stable `key` so AnimatePresence can
 * track entrances/exits. Respects `prefers-reduced-motion` (no transform/height
 * animation — just an instant swap).
 */
export function CollapsibleList({
  className,
  children,
  staggerMs = 35,
  initialDelayMs = 0,
}: {
  className?: string;
  children: React.ReactNode;
  staggerMs?: number;
  initialDelayMs?: number;
}) {
  const reduce = useReducedMotion();
  const items = React.Children.toArray(children).filter(React.isValidElement);

  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {items.map((child, i) => (
          <motion.div
            key={(child as React.ReactElement).key ?? i}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
            transition={{
              duration: 0.22,
              ease: [0.25, 0.1, 0.25, 1],
              delay: reduce ? 0 : (initialDelayMs + Math.min(i, 8) * staggerMs) / 1000,
            }}
            style={{ overflow: "hidden" }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
