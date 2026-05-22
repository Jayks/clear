"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";

const DONE_KEY = "clear_nest_hint_done";

const STEPS = [
  {
    target: "[data-tour='templates-section']",
    title: "Recurring expenses",
    description: "Set up templates for rent, electricity, and WiFi once — then log each month with one tap.",
  },
  {
    target: "[data-tour='log-template-btn']",
    title: "Log for this month",
    description: "One tap logs the expense for the current month. Clear prevents double-logging automatically.",
  },
];

export function NestHint() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DONE_KEY)) return;
    // Small delay — let the page render templates first
    const t = setTimeout(() => {
      const el = document.querySelector(STEPS[0].target);
      if (el) setStep(0);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (step === null) return;
    const target = STEPS[step]?.target;
    if (!target) return;
    const el = document.querySelector(target);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => {
      setRect(el.getBoundingClientRect());
    });
  }, [step]);

  function advance() {
    if (step === null) return;
    if (step + 1 < STEPS.length) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    setStep(null);
    localStorage.setItem(DONE_KEY, "1");
  }

  const current = step !== null ? STEPS[step] : null;
  if (!current) return null;

  const vpH = typeof window !== "undefined" ? window.innerHeight : 800;
  const popoverBottom = rect ? vpH - rect.top + 12 : 80;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[900] left-4 right-4 glass rounded-2xl shadow-2xl shadow-cyan-500/10 p-4"
          style={{ bottom: Math.min(popoverBottom, vpH - 180) }}
        >
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3
              className="text-sm font-semibold text-slate-800 dark:text-slate-100"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {current.title}
            </h3>
            <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
            {current.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${i === step! ? "w-4 h-1.5 bg-cyan-500" : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600"}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={dismiss} className="text-xs text-slate-500 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                Skip
              </button>
              <button
                onClick={advance}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm shadow-cyan-500/25"
              >
                {(step ?? 0) + 1 < STEPS.length ? <>Next <ChevronRight className="w-3 h-3" /></> : "Got it"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
