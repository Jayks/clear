"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { getTourSteps, DEFAULT_STEP_COUNT } from "@/lib/tour/steps";
import { TourLayer } from "./tour-layer";

const DONE_KEY = "clear_tour_done";

interface TourContextValue {
  active: boolean;
  step: number;
  totalSteps: number;
  showExtended: boolean;
  showCelebration: boolean;
  isCompleted: boolean;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  showMore: () => void;
  finishCelebration: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside TourProvider");
  return ctx;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [showExtended, setShowExtended] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [demoTripId, setDemoTripId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const steps = getTourSteps(demoTripId);
  const totalSteps = showExtended ? steps.length : DEFAULT_STEP_COUNT;

  // Read completion state from localStorage
  useEffect(() => {
    setIsCompleted(!!localStorage.getItem(DONE_KEY));
  }, []);

  // Auto-launch for first-time users
  useEffect(() => {
    if (localStorage.getItem(DONE_KEY)) return;
    const launch = () => {
      if (!document.querySelector("[data-tour='new-trip-btn']")) {
        setTimeout(launch, 250);
        return;
      }
      setActive(true);
    };
    const t = setTimeout(launch, 300);
    return () => clearTimeout(t);
  }, []);

  // Read demoTripId from the demo-trip card href
  useEffect(() => {
    if (!active || demoTripId) return;
    const tryRead = () => {
      const el = document.querySelector("[data-tour='demo-trip']");
      if (!el) return false;
      const link = el.querySelector("a") as HTMLAnchorElement | null;
      const href = link?.getAttribute("href") ?? "";
      const match = href.match(/^\/groups\/([^/]+)$/);
      if (match?.[1]) { setDemoTripId(match[1]); return true; }
      return false;
    };
    if (!tryRead()) {
      const t = setTimeout(tryRead, 800);
      return () => clearTimeout(t);
    }
  }, [active, pathname, demoTripId, step]);

  // Navigate to the step's required page
  useEffect(() => {
    if (!active) return;
    const currentStep = steps[step];
    if (currentStep?.page && pathname !== currentStep.page) {
      router.push(currentStep.page);
    }
  }, [active, step, pathname, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch next step's page
  useEffect(() => {
    if (!active) return;
    const nextStep = steps[step + 1];
    if (nextStep?.page) router.prefetch(nextStep.page);
  }, [active, step, steps, router]);

  // Prefetch all inner trip pages when demoTripId is known
  useEffect(() => {
    if (!active || !demoTripId) return;
    const base = `/groups/${demoTripId}`;
    [base, `${base}/expenses`, `${base}/settle`, `${base}/insights`].forEach(
      (p) => router.prefetch(p)
    );
  }, [active, demoTripId, router]);

  // Step 4 (index 3): fire custom event to open demo nav sheet
  useEffect(() => {
    if (!active || step !== 3 || !demoTripId) return;
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-demo-navsheet", { detail: demoTripId }));
    }, 400);
    return () => clearTimeout(t);
  }, [active, step, demoTripId]);

  // Step 3 (index 2): interactive — auto-advance when quick-add sheet opens
  const autoAdvancedRef = useRef(false);
  useEffect(() => {
    if (!active || step !== 2) { autoAdvancedRef.current = false; return; }
    const interval = setInterval(() => {
      if (autoAdvancedRef.current) return;
      if (document.querySelector("[data-tour='quick-add-open']")) {
        autoAdvancedRef.current = true;
        clearInterval(interval);
        setTimeout(() => setStep(3), 1000);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [active, step]);

  // Escape key exits tour
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback((navigateHome = true) => {
    setActive(false);
    setShowExtended(false);
    setShowCelebration(false);
    localStorage.setItem(DONE_KEY, "1");
    setIsCompleted(true);
    if (navigateHome) router.push("/groups");
  }, [router]);

  const next = useCallback(() => {
    const isLastExtended = showExtended && step + 1 >= steps.length;
    if (isLastExtended) {
      router.push("/groups");
      setStep(steps.length - 1); // stay on last step visually
      setTimeout(() => setShowCelebration(true), 400);
      return;
    }
    setStep((s) => s + 1);
  }, [step, steps.length, showExtended, router]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => finish(false), [finish]);

  const showMore = useCallback(() => {
    setShowExtended(true);
    setStep(DEFAULT_STEP_COUNT); // advance to first extended step (index 4)
  }, []);

  const finishCelebration = useCallback(() => {
    finish(false);
  }, [finish]);

  const start = useCallback(() => {
    localStorage.removeItem(DONE_KEY);
    setIsCompleted(false);
    setDemoTripId(null);
    setStep(0);
    setShowExtended(false);
    setShowCelebration(false);
    setActive(true);
  }, []);

  return (
    <TourContext.Provider
      value={{
        active,
        step,
        totalSteps,
        showExtended,
        showCelebration,
        isCompleted,
        start,
        next,
        prev,
        skip,
        showMore,
        finishCelebration,
      }}
    >
      {children}
      {(active || showCelebration) && steps[step] && (
        <TourLayer
          step={steps[step]}
          stepIndex={step}
          totalSteps={totalSteps}
          showExtended={showExtended}
          showCelebration={showCelebration}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
          onShowMore={showMore}
          onCelebrationDone={finishCelebration}
        />
      )}
    </TourContext.Provider>
  );
}
