"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, X } from "lucide-react";
import { useTour } from "@/components/tour/tour-context";

/**
 * One-time "your sample's ready — want a tour?" snackbar, shown right after the
 * user loads a sample (gated on the clear_sample_just_seeded flag, which it
 * consumes). Decoupled from the tab-landing logic, which keys off clear_home_tab.
 */
export function SampleTourPrompt({ demoTripId }: { demoTripId: string | null }) {
  const { start } = useTour();
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem("clear_sample_just_seeded") === "1") {
        sessionStorage.removeItem("clear_sample_just_seeded");
        setShow(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          className="fixed left-4 right-4 bottom-nav-safe md:left-auto md:right-6 md:w-96 z-50"
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                          border border-slate-200/70 dark:border-slate-700/60
                          rounded-2xl shadow-xl shadow-cyan-500/10 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500
                            flex items-center justify-center shrink-0 shadow-sm">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Your sample&apos;s ready 🎉
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                Want a quick 30-second tour of how it works?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShow(false); start(demoTripId); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white
                             bg-gradient-to-br from-cyan-500 to-teal-500
                             hover:from-cyan-600 hover:to-teal-600 shadow-sm shadow-cyan-500/25 transition-all"
                >
                  Take the tour
                </button>
                <button
                  type="button"
                  onClick={() => setShow(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium
                             text-slate-500 dark:text-slate-400
                             hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShow(false)}
              aria-label="Dismiss"
              className="shrink-0 p-0.5 -mt-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
