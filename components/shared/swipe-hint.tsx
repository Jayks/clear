"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoveLeft } from "lucide-react";

const HINT_KEY = "clear_swipe_hint_done";

export function SwipeHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(HINT_KEY)) return;
    // Only show on touch devices
    if (!navigator.maxTouchPoints) return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

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
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.25 }}
          onClick={dismiss}
          className="flex items-center gap-2 mx-auto mt-1 mb-1 px-3 py-1.5 rounded-full bg-slate-800/80 dark:bg-slate-700/80 backdrop-blur-sm text-white text-xs font-medium shadow-lg"
        >
          <MoveLeft className="w-3.5 h-3.5 shrink-0" />
          Swipe left on an expense to delete
        </motion.button>
      )}
    </AnimatePresence>
  );
}
