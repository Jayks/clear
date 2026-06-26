"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface OlderReleasesToggleProps {
  children: React.ReactNode;
  count: number;
}

export function OlderReleasesToggle({ children, count }: OlderReleasesToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Divider + toggle button */}
      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 glass hover:shadow-sm transition-all"
          aria-expanded={open}
        >
          <span>{open ? "Hide older releases" : `Show ${count} older releases`}</span>
          <ChevronDown
            className="w-4 h-4 transition-transform duration-300"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
      </div>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="older-releases"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="space-y-10 pt-10">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
