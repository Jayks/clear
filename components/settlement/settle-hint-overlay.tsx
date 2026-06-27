"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";
import { useTour } from "@/components/tour/tour-context";

interface Props {
  /** Only show the overlay when real debts exist (not on an all-settled group). */
  hasDebts: boolean;
}

/**
 * SettleHintOverlay — one-shot glass overlay inside the DebtFlowGraph card.
 * Explains the graph (arrows = direction, nodes = tappable, optimized count)
 * the first time a user sees active debts. Site-wide localStorage key — shows
 * once across all groups.
 */
export function SettleHintOverlay({ hasDebts }: Props) {
  const { active: tourActive } = useTour();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasDebts) return;
    // Suppress during the onboarding tour — the tour IS the guide for this page;
    // overlaying it blocks the graph step. The hint will show on the user's next
    // organic settle visit once the tour is done.
    if (tourActive) return;
    if (localStorage.getItem(ONBOARDING_KEYS.SETTLE_HINT) === "1") return;
    // Small delay — let the graph render and animate first.
    const t = setTimeout(() => setShow(true), 400);
    return () => clearTimeout(t);
  }, [hasDebts, tourActive]);

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEYS.SETTLE_HINT, "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center
                     bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl p-6"
        >
          {/* Icon badge */}
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30
                          flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* Explanation bullets */}
          <div className="space-y-2.5 mb-5 w-full max-w-xs">
            {[
              { emoji: "↔️", text: "Arrows show who owes who — follow the direction" },
              { emoji: "👆", text: "Tap any name to pay or mark as paid" },
              { emoji: "✨", text: "We find the minimum number of transfers to zero everything out" },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="text-base leading-5 shrink-0">{emoji}</span>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={dismiss}
            className="w-full max-w-xs min-h-[44px] flex items-center justify-center gap-2
                       bg-gradient-to-br from-emerald-500 to-teal-500
                       hover:from-emerald-600 hover:to-teal-600
                       text-white text-sm font-semibold rounded-xl
                       shadow-md shadow-emerald-500/25 transition-all"
          >
            Got it, let&apos;s go
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
