"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/tour/types";

const PAD = 8;
const BLUR = "blur(6px)";
const TINT = "rgba(0,0,0,0.45)";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

/** Returns the 4 quadrant rects that surround the spotlight cutout. */
function quadrants(rect: Rect, vpW: number, vpH: number) {
  const t = Math.max(0, rect.top - PAD);
  const l = Math.max(0, rect.left - PAD);
  const r = Math.min(vpW, rect.left + rect.width + PAD);
  const b = Math.min(vpH, rect.top + rect.height + PAD);
  return [
    { key: "top",    style: { top: 0, left: 0, right: 0, height: t } },
    { key: "bottom", style: { top: b, left: 0, right: 0, bottom: 0 } },
    { key: "left",   style: { top: t, left: 0, width: l, height: b - t } },
    { key: "right",  style: { top: t, left: r, right: 0, height: b - t } },
  ];
}

export function TourLayer({ step, stepIndex, totalSteps, onNext, onPrev, onSkip }: Props) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Reset rect immediately on step change so the old spotlight never bleeds
  // onto the next page while it loads.
  useEffect(() => {
    setRect(null);
    if (!step.target) return;

    const measure = () => {
      // Pick the first element matching the selector that is actually visible
      // (non-zero size). This handles data-tour attrs on both top-nav and
      // bottom-nav where one is display:none depending on breakpoint.
      const candidates = Array.from(document.querySelectorAll(step.target!));
      const el = candidates.find((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 0 || r.height > 0;
      });
      if (!el) { setTimeout(measure, 100); return; }
      el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        });
      });
    };

    requestAnimationFrame(measure);
    const onResize = () => requestAnimationFrame(measure);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [step.target]);

  if (!mounted) return null;

  const vpH = window.innerHeight;
  const vpW = window.innerWidth;
  const isMobile = vpW < 640;
  const isLoading = !!step.target && !rect;
  const isReady   = !step.target || !!rect;

  // Popover position
  let popoverStyle: React.CSSProperties;
  if (isMobile) {
    // On mobile: always anchor to bottom above the mobile nav bar (~64px)
    popoverStyle = {
      position: "fixed",
      bottom: 72,
      left: 12,
      right: 12,
      zIndex: 1003,
    };
  } else if (!step.target || !rect) {
    const popoverW = Math.min(360, vpW - 24);
    popoverStyle = {
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)", zIndex: 1003, width: popoverW,
    };
  } else {
    const popoverW = Math.min(360, vpW - 24);
    const POPOVER_H = 210;
    const spotBottom = rect.top + rect.height + PAD;
    const belowSpace = vpH - spotBottom - 16;
    const useBelow   = belowSpace >= POPOVER_H || belowSpace >= rect.top - PAD;
    const rawTop = useBelow ? spotBottom + 12 : rect.top - PAD - POPOVER_H - 12;
    const top  = Math.max(8, Math.min(rawTop, vpH - POPOVER_H - 8));
    const left = Math.max(12, Math.min(rect.left - PAD, vpW - popoverW - 12));
    popoverStyle = { position: "fixed", top, left, zIndex: 1003, width: popoverW };
  }

  return createPortal(
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────── */}

      {/* Full-screen blur overlay: loading state OR null-target (welcome modal) */}
      <AnimatePresence>
        {!rect && (
          <motion.div
            key="full-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1001] pointer-events-all"
            style={{ backdropFilter: BLUR, background: TINT }}
          />
        )}
      </AnimatePresence>

      {/* 4-quadrant blur surround: rendered once rect is known */}
      <AnimatePresence>
        {step.target && rect && quadrants(rect, vpW, vpH).map(({ key, style }) => (
          <motion.div
            key={key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[1001] pointer-events-all"
            style={{ ...style, backdropFilter: BLUR, background: TINT }}
          />
        ))}
      </AnimatePresence>

      {/* Transparent click-blocker over the spotlight area (locked mode) */}
      {step.target && rect && (
        <div
          className="fixed z-[1001] pointer-events-all"
          style={{
            top:    rect.top  - PAD,
            left:   rect.left - PAD,
            width:  rect.width  + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      )}

      {/* Cyan spotlight ring */}
      <AnimatePresence>
        {step.target && rect && (
          <motion.div
            key={`ring-${step.target}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed rounded-xl z-[1002] pointer-events-none"
            style={{
              top:    rect.top  - PAD,
              left:   rect.left - PAD,
              width:  rect.width  + PAD * 2,
              height: rect.height + PAD * 2,
              boxShadow: "0 0 0 2px rgb(6 182 212 / 0.8), 0 0 16px 2px rgb(6 182 212 / 0.25)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Loading spinner ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, delay: 0.15 }}
            className="fixed inset-0 z-[1002] flex items-center justify-center pointer-events-none"
          >
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Popover ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isReady && (
          <motion.div
            key={`pop-${stepIndex}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-2xl shadow-2xl shadow-cyan-500/10"
            style={{ ...popoverStyle, pointerEvents: "all" }}
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3
                  className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-snug"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  {step.title}
                </h3>
                <button
                  onClick={onSkip}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 -mt-0.5 p-0.5 rounded"
                  aria-label="Skip tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                {step.description}
              </p>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 shrink-0">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-200",
                        i === stepIndex
                          ? "w-4 h-1.5 bg-cyan-500"
                          : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600"
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  {stepIndex > 0 && (
                    <button
                      onClick={onPrev}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[36px]"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={onNext}
                    className="flex items-center gap-1 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-cyan-500/25 min-h-[36px]"
                  >
                    {stepIndex === totalSteps - 1 ? "Done" : (
                      <>Next <ChevronRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
