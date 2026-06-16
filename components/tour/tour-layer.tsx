"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight,
  MapPin, Building2, Coins, ArrowLeftRight,
  Camera, Mic, Keyboard, List, CalendarDays, Map as MapIcon, SlidersHorizontal,
  Plus, PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/tour/types";
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
  showCelebration: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
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

// Welcome modal — the four contexts
function WelcomeVisual() {
  const items = [
    { icon: MapPin,        label: "Trip",   color: "from-cyan-500 to-teal-500",     desc: "Travel & events" },
    { icon: Building2,     label: "Nest",   color: "from-emerald-500 to-teal-500",  desc: "Shared homes" },
    { icon: Coins,         label: "Circle", color: "from-violet-500 to-purple-600", desc: "A shared pot" },
    { icon: ArrowLeftRight,label: "Stream", color: "from-indigo-500 to-violet-500", desc: "One-on-one IOUs" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mt-3 mb-1">
      {items.map(({ icon: Icon, label, color, desc }) => (
        <div key={label} className="rounded-xl bg-white/30 dark:bg-slate-800/40 p-2.5 flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">{label}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Tile used by both legends
function LegendTile({ icon: Icon, label, sub, color }: { icon: typeof Camera; label: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl bg-white/40 dark:bg-slate-800/50 p-2.5 text-center">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-1.5`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">{label}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{sub}</p>
    </div>
  );
}

// Quick-add modes — Scan / Speak / Type
function QuickAddLegend() {
  return (
    <div className="mt-2 mb-1">
      <div className="grid grid-cols-3 gap-2">
        <LegendTile icon={Camera}   label="Scan"  sub="a receipt"  color="from-cyan-500 to-teal-500" />
        <LegendTile icon={Mic}      label="Speak" sub="say it out"  color="from-rose-500 to-orange-500" />
        <LegendTile icon={Keyboard} label="Type"  sub="type it in"  color="from-slate-500 to-slate-600" />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
        Clear&apos;s AI reads the amount, payer and split for you — free on every plan.
      </p>
    </div>
  );
}

// Expenses — filters + List / Timeline / Map views
function ViewsLegend() {
  return (
    <div className="mt-2 mb-1">
      <div className="flex items-center gap-2 mb-2.5 text-xs text-slate-600 dark:text-slate-300">
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
        Filter by payer · date · category · search
      </div>
      <div className="grid grid-cols-3 gap-2">
        <LegendTile icon={List}         label="List"     sub="flat view"   color="from-cyan-500 to-teal-500" />
        <LegendTile icon={CalendarDays} label="Timeline" sub="day by day"  color="from-violet-500 to-purple-600" />
        <LegendTile icon={MapIcon}      label="Map"      sub="where you spent" color="from-emerald-500 to-teal-500" />
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
        A flat list, a day-by-day timeline, or a map of where the money went (on trips).
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
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/60 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 w-full max-w-sm text-center"
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
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Keep exploring the sample, or start your own group when you&apos;re ready.
        </p>
        <div className="space-y-2">
          <Link
            href="/groups/new?type=trip"
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
            Keep exploring
          </Link>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export function TourLayer({
  step, stepIndex, totalSteps, showCelebration,
  onNext, onPrev, onSkip, onCelebrationDone,
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
      // On mobile the popover is pinned to the bottom, so scroll the spotlight into
      // the upper area (just below the nav) to keep it clear. On desktop, centre it.
      if (window.innerWidth < 640) {
        const r0 = el.getBoundingClientRect();
        window.scrollBy({ top: r0.top - 90, behavior: "instant" as ScrollBehavior });
      } else {
        el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
      }
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
  const isLast = stepIndex === totalSteps - 1;
  const hasLegend = !!step.quickAddLegend || !!step.viewsLegend;

  // Popover position
  let popoverStyle: React.CSSProperties;
  if (isMobile) {
    // Always pinned above the nav — the spotlight is scrolled into the upper area
    // (see the measure effect) so it stays clear of the popover.
    popoverStyle = { position: "fixed", bottom: 72, left: 12, right: 12, zIndex: 1003 };
  } else if (!step.target || !rect) {
    const popoverW = Math.min(380, vpW - 24);
    popoverStyle = { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1003, width: popoverW };
  } else {
    const popoverW = Math.min(360, vpW - 24);
    const POPOVER_H = hasLegend ? 290 : 210;
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
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                     border border-slate-200/70 dark:border-slate-700/60
                     rounded-2xl shadow-2xl shadow-cyan-500/10"
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
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4 mt-2">
                <div className="w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 border-t-cyan-500 rounded-full animate-spin shrink-0" />
                <span>{slowLoad ? "Taking a moment — hang on…" : "Loading…"}</span>
              </div>
            ) : step.quickAddLegend ? (
              <QuickAddLegend />
            ) : step.viewsLegend ? (
              <ViewsLegend />
            ) : stepIndex === 0 && !step.target ? (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {step.description}
                </p>
                <WelcomeVisual />
              </>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
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
                {stepIndex > 0 && (
                  <button
                    onClick={onPrev}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[36px]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}

                {isLast ? (
                  <button
                    onClick={onNext}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-cyan-500/25 min-h-[36px] disabled:opacity-50"
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
