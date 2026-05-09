"use client";

import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode[];
  className?: string;
  staggerMs?: number;
}

export function AnimatedList({ children, className, staggerMs = 40 }: Props) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: (i * staggerMs) / 1000, ease: "easeOut" }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
