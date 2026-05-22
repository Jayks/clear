"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight,
  Users, Receipt, ArrowLeftRight, BarChart2,
  MapPin, Home, Zap, Plus, PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/tour/types";
import { DEFAULT_STEP_COUNT } from "@/lib/tour/steps";
import Link from "next/link";

const PAD = 8;
const BLUR = "blur(6px)";
const TINT_FULL = "rgba(0,0,0,0.45)";
const TINT_LOAD = "rgba(0,0,0,0.28)";

interface Rect { top: number; left: number; width: number; height: number; }

interface Props {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  showExtended: boolean;
  showCelebration: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onShowMore: () => void;
  onCelebrationDone: () => void;
}

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

// Nav sheet mini-legend items
const NAV_LEGEND = [
  { icon: Users,          label: "Members",   desc: "Manage who's in the group" },
  { icon: Receipt,        label: "Expenses",  desc: "Log and browse spending" },
  { icon: ArrowLeftRight, label: "Settle Up", desc: "See who owes what" },
  { icon: BarChart2,      label: "Insights",  desc: "Charts and trends" },
];

// Welcome modal visual comparison
function WelcomeVisual() {
  return (
    <div className="grid grid-cols-2 gap-2 mt-3 mb-1">
      {[
        {
          icon: MapPin,
          label: "Trip",
          color: "from-cyan-500 to-teal-500",
          features: ["Multi-day travel", "Budget tracking", "AI narrative"],
        },
        {
          icon: Home,
          label: "Nest",
          color: "from-teal-500 to-emerald-500",
          features: ["Shared home", "Recurring bills", "Monthly view"],
        },
      ].map(({ icon: Icon, label, color, features }) => (
        <div key={label} className="rounded-xl bg-white/30 dark:bg-slate-800/40 p-3">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">{label}</p>
          {features.map((f) => (
            <p key={f} className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-0.5">· {f}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

// Nav legend content
function NavLegend() {
  return (
    <div className="mt-1 mb-1 space-y-1.5">
      {NAV_LEGEND.map(({ icon: Icon, label, desc }) => (
        <div key={label} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500"> — {desc}</span>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
        On mobile, long press any card to open this menu.
      </p>
    </div>
  );
}

// Celebration modal
function CelebrationCard({ onDone }: { onDone: () => void }) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[1001] flex items-center justify-center px-4"
      style={{ backdropFilter: BLUR, background: TINT_FULL }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 260 }}
        className="glass rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 w-full max-w-sm text-center"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -8, 8, 0] }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-4xl mb-3"
        >
          🎉
        </motion.div>
        <h3
          className="text-xl text-slate-800 dark:text-slate-100 mb-1"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          You know the ropes!
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          You&apos;re all set to split expenses and settle up clearly.
        </p>
        <div className="space-y-2">
          <Link
            href="/groups/new"
            onClick={onDone}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-medium shadow-md shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create your first group
          </Link>
          <Link
            href="/groups"
            onClick={onDone}
            className="block w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-center"
          >
            Let&apos;s go
          </Link>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export function TourLayer({
  step, stepIndex, totalSteps, showExtended, showCelebration,
  onNext, onPrev, onSkip, onShowMore, onCelebrationDone,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!step.target) { setSlowLoad(false); return; }
    setSlowLoad(false);
    const t = setTimeout(() => setSlowLoad(true), 1500);
    return () => clearTimeout(t);
  }, [step.target]);

  useEffect(() => {
    setRect(null);
    if (!step.target) return;
    const measure = () => {
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
  if (showCelebration) return <CelebrationCard onDone={onCelebrationDone} />;

  const vpH = window.innerHeight;
  const vpW = window.innerWidth;
  const isMobile = vpW < 640;
  const isLoading = !!step.target && !rect;
  const isLastDefault = !showExtended && stepIndex === DEFAULT_STEP_COUNT - 1;
  const isLastExtended = showExtended && stepIndex === totalSteps - 1;
  const isLast = isLastDefault || isLastExtended;

  // Popover position
  let popoverStyle: React.CSSProperties;
  if (isMobile) {
    popoverStyle = { position: "fixed", bottom: 72, left: 12, right: 12, zIndex: 1003 };
  } else if (!step.target || !rect) {
    const popoverW = Math.min(380, vpW - 24);
    popoverStyle = { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1003, width: popoverW };
  } else {
    const popoverW = Math.min(360, vpW - 24);
    const POPOVER_H = step.navLegend ? 260 : 210;
    const spotBottom = rect.top + rect.height + PAD;
    const belowSpace = vpH - spotBottom - 16;
    const useBelow = belowSpace >= POPOVER_H || belowSpace >= rect.top - PAD;
    const rawTop = useBelow ? spotBottom + 12 : rect.top - PAD - POPOVER_H - 12;
    const top = Math.max(8, Math.min(rawTop, vpH - POPOVER_H - 8));
    const left = Math.max(12, Math.min(rect.left - PAD, vpW - popoverW - 12));
    popoverStyle = { position: "fixed", top, left, zIndex: 1003, width: popoverW };
  }

  return createPortal(
    <>
      {/* ── Backdrop ─────────────────────────────── */}
      <AnimatePresence>
        {!rect && (
          <motion.div
            key="full-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1001] pointer-events-all"
            style={{ backdropFilter: BLUR, background: isLoading ? TINT_LOAD : TINT_FULL }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step.target && rect && quadrants(rect, vpW, vpH).map(({ key, style }) => (
          <motion.div
            key={key}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[1001] pointer-events-all"
            style={{ ...style, backdropFilter: BLUR, background: TINT_FULL }}
          />
        ))}
      </AnimatePresence>

      {step.target && rect && (
        <div
          className="fixed z-[1001] pointer-events-all"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      )}

      {/* Pulsing spotlight ring */}
      <AnimatePresence>
        {step.target && rect && (
          <motion.div
            key={`ring-${step.target}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: [1, 1.03, 1] }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.2 },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
            className="fixed rounded-xl z-[1002] pointer-events-none"
            style={{
              top: rect.top - PAD, left: rect.left - PAD,
              width: rect.width + PAD * 2, height: rect.height + PAD * 2,
              boxShadow: "0 0 0 2px rgb(6 182 212 / 0.8), 0 0 16px 2px rgb(6 182 212 / 0.25)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Popover ──────────────────────────────── */}
      <AnimatePresence>
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
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3
                  className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-snug"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  {step.title}
                </h3>
                {step.isSampleData && (
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                    Sample data
                  </span>
                )}
              </div>
              <button
                onClick={onSkip}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 -mt-0.5 p-0.5 rounded"
                aria-label="Exit tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-4 mt-2">
                <div className="w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 border-t-cyan-500 rounded-full animate-spin shrink-0" />
                <span>{slowLoad ? "Taking a moment — hang on…" : "Loading…"}</span>
              </div>
            ) : step.navLegend ? (
              <NavLegend />
            ) : stepIndex === 0 && !step.target ? (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.description}
                </p>
                <WelcomeVisual />
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                {step.description}
              </p>
            )}

            {/* Footer: dots + actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap mt-3">
              {/* Dot indicator */}
              <div className="flex items-center gap-1.5 shrink-0">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-full transition-all duration-200",
                      i === stepIndex
                        ? "w-4 h-1.5 bg-cyan-500"
                        : i < stepIndex
                        ? "w-1.5 h-1.5 bg-cyan-300 dark:bg-cyan-700"
                        : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600"
                    )}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {stepIndex > 0 && !isLastDefault && (
                  <button
                    onClick={onPrev}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[36px]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}

                {isLastDefault ? (
                  // End of default tour: Done + Show me more
                  <>
                    <button
                      onClick={onSkip}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[36px]"
                    >
                      Done
                    </button>
                    <button
                      onClick={onShowMore}
                      disabled={isLoading}
                      className="flex items-center gap-1 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-cyan-500/25 min-h-[36px] disabled:opacity-50"
                    >
                      Show me more
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : isLastExtended ? (
                  <button
                    onClick={onNext}
                    className="flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-cyan-500/25 min-h-[36px]"
                  >
                    <PartyPopper className="w-3.5 h-3.5" />
                    Finish
                  </button>
                ) : (
                  <button
                    onClick={onNext}
                    disabled={isLoading}
                    className="flex items-center gap-1 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-cyan-500/25 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body
  );
}
