"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Check } from "lucide-react";
import Link from "next/link";

const PLUS_FEATURES = [
  "Unlimited active groups (free: up to 5)",
  "Recurring expense templates",
  "AI trip narrative & Plan-vs-Reality",
  "Budget tracking",
  "Personal You-tab insights",
  "Permanent receipt vault (free: 60 days)",
  "CSV export",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UpgradePrompt({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-2xl p-6"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-md shadow-cyan-500/25 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Clear Plus
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unlock the full experience</p>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6">
              {PLUS_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Check className="w-4 h-4 text-teal-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/upgrade"
              onClick={onClose}
              className="block w-full text-center py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all"
            >
              See plans →
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
