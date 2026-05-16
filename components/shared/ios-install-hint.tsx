"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share } from "lucide-react";
import { ClearIcon } from "@/components/shared/clear-logo";

const DISMISSED_KEY = "clear_ios_hint_dismissed";

function isIOSSafari() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios|android/i.test(ua);
  return isIOS && isSafari;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function IOSInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (
      isIOSSafari() &&
      !isStandalone() &&
      localStorage.getItem(DISMISSED_KEY) !== "1"
    ) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="fixed bottom-nav-safe md:bottom-6 left-3 right-3 z-[60]"
        >
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-black/10">
            {/* App icon */}
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm shadow-cyan-500/30"
              style={{ background: "linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)" }}
            >
              <ClearIcon size={26} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                Install Clear
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Tap{" "}
                <Share className="inline w-3.5 h-3.5 mx-0.5 relative -top-px text-cyan-600 dark:text-cyan-400" />
                {" "}then{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Add to Home Screen
                </span>
              </p>
            </div>

            {/* Dismiss */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
