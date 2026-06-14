"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, ArrowRight, MapPin, Home, Coins, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { seedSampleStep, type SampleStep } from "@/app/actions/demo";
import { interstitialReady, tipIndexAt } from "@/lib/demo/interstitial";
import { ClearLogo } from "@/components/shared/clear-logo";

const MIN_MS = 2600; // floor so the screen is readable even on a fast seed
const TIP_INTERVAL_MS = 2200;

const STEPS: { key: SampleStep; label: string; icon: LucideIcon }[] = [
  { key: "trip", label: "Trip", icon: MapPin },
  { key: "nest", label: "Nest", icon: Home },
  { key: "circle", label: "Circle", icon: Coins },
];

const TIPS: { emoji: string; text: string }[] = [
  { emoji: "📸", text: "Snap a receipt — Clear's AI reads the items and splits them for you." },
  { emoji: "🎙️", text: "Say it out loud — log an expense by voice, hands-free." },
  { emoji: "🗺️", text: "Trips map your spending — see where every expense happened." },
  { emoji: "🔄", text: "Nests auto-log recurring bills each month — set rent once." },
  { emoji: "💸", text: "Settle Up finds the fewest payments to clear everyone's debts." },
  { emoji: "👥", text: "Add anyone by name — friends don't need an account to join." },
  { emoji: "🔵", text: "Circles pool money toward a shared goal or fund." },
  { emoji: "📊", text: "Insights turns your spending into a story across every trip." },
];

export function SampleLoader() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stepDone, setStepDone] = useState(0); // 0..3 contexts seeded
  const doneRef = useRef(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!seeding) return;
    const start = Date.now();
    doneRef.current = false;
    finishedRef.current = false;
    setStepDone(0);
    let cancelled = false;

    // Tick drives the elapsed clock (tips + minimum-display gate).
    const tick = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      if (!finishedRef.current && interstitialReady(doneRef.current, e, MIN_MS)) {
        finishedRef.current = true;
        clearInterval(tick);
        try {
          sessionStorage.setItem("clear_sample_just_seeded", "1"); // post-seed tour prompt
          sessionStorage.setItem("clear_home_tab", "sample");      // land on the Sample tab
        } catch {
          /* private mode — non-fatal */
        }
        router.refresh();
      }
    }, 120);

    // Seed the three contexts one at a time for honest per-step progress.
    (async () => {
      for (const s of STEPS) {
        const r = await seedSampleStep(s.key);
        if (cancelled) return;
        if (!r.ok) {
          clearInterval(tick);
          toast.error(r.error);
          setSeeding(false);
          return;
        }
        setStepDone((n) => n + 1);
      }
      doneRef.current = true;
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [seeding, router]);

  return (
    <>
      {/* "or" divider between create-your-own and explore-a-sample */}
      <div className="flex items-center gap-3 mt-5 mb-4">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
        <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">or</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
      </div>

      <button
        type="button"
        onClick={() => setSeeding(true)}
        className="w-full flex items-center gap-4 p-4 rounded-2xl text-left group
                   border border-dashed border-slate-300 dark:border-slate-700
                   hover:border-amber-300 dark:hover:border-amber-700/60
                   hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400
                        flex items-center justify-center shrink-0 shadow-sm">
          <Compass className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Explore a sample</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            A trip, nest &amp; circle to poke around — remove anytime.
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0
                              group-hover:text-amber-500 transition-colors" />
      </button>

      {seeding && <SeedingScreen elapsed={elapsed} stepDone={stepDone} />}
    </>
  );
}

function SeedingScreen({ elapsed, stepDone }: { elapsed: number; stepDone: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const tip = TIPS[tipIndexAt(elapsed, TIP_INTERVAL_MS, TIPS.length)];
  const pct = Math.round((stepDone / STEPS.length) * 100);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center px-6
                 bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50
                 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    >
      {/* Pulsing brand mark with a soft halo */}
      <div className="relative mb-6">
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-2xl bg-cyan-400/40 blur-md"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <ClearLogo iconSize={60} showWordmark={false} className="flex" />
        </motion.div>
      </div>

      <h2
        className="text-xl text-slate-800 dark:text-slate-100 mb-1.5 text-center"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        Setting up your sample…
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
        A trip, a nest, and a circle to explore
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        />
      </div>

      {/* Per-context checklist */}
      <div className="flex items-start justify-center gap-6 mb-8">
        {STEPS.map((s, i) => {
          const done = i < stepDone;
          const active = i === stepDone;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                  ${done
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/30"
                    : active
                    ? "bg-gradient-to-br from-cyan-500 to-teal-500 shadow-sm shadow-cyan-500/30"
                    : "bg-slate-200 dark:bg-slate-800"}`}
              >
                {done ? (
                  <Check className="w-4 h-4 text-white" />
                ) : active ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <span
                className={`text-[11px] ${
                  done || active
                    ? "text-slate-600 dark:text-slate-300 font-medium"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rotating tip */}
      <div className="h-16 flex items-start justify-center w-full max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={tip.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-xl px-4 py-3 flex items-start gap-2.5 w-full"
          >
            <span className="text-base leading-none shrink-0 mt-0.5">{tip.emoji}</span>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{tip.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>,
    document.body,
  );
}
