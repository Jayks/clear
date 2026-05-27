"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";

const HINT_KEY = "clear_longpress_hint_done";

export function LongPressHint({ demoTripId }: { demoTripId: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!demoTripId) return;
    if (localStorage.getItem(HINT_KEY)) return;
    // Only show on touch devices
    if (!navigator.maxTouchPoints) return;
    // Don't show while the onboarding tour is still active — the tour has its
    // own spotlight backdrop and showing both at once creates visual conflict.
    if (!localStorage.getItem("clear_tour_done")) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [demoTripId]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, 4000);
    return () => clearTimeout(t);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(HINT_KEY, "1");
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25 }}
          onClick={dismiss}
          className="flex items-center gap-2 mx-auto mt-2 px-3 py-1.5 rounded-full bg-slate-800/80 dark:bg-slate-700/80 backdrop-blur-sm text-white text-xs font-medium shadow-lg"
        >
          <Hand className="w-3.5 h-3.5 shrink-0" />
          Long press any card for quick navigation
        </motion.button>
      )}
    </AnimatePresence>
  );
}
