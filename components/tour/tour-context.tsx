"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { getTourSteps } from "@/lib/tour/steps";
import { TourLayer } from "./tour-layer";

const DONE_KEY = "clear_tour_done";

interface TourContextValue {
  active: boolean;
  step: number;
  totalSteps: number;
  showCelebration: boolean;
  isCompleted: boolean;
  start: (demoTripId?: string | null) => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [demoTripId, setDemoTripId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const steps = getTourSteps(demoTripId);
  const totalSteps = steps.length;

  // Read completion state from localStorage
  useEffect(() => {
    setIsCompleted(!!localStorage.getItem(DONE_KEY));
  }, []);

  // The tour is started explicitly via start() (post-seed prompt / sample banner).
  // It anchors on the sample data, so it only runs once the demo exists.

  // Resolve demoTripId from the demo-trip card href (set on the demo TripCard).
  useEffect(() => {
    if (!active || demoTripId) return;
    const tryRead = () => {
      const el = document.querySelector("[data-tour='demo-trip']");
      if (!el) return false;
      const links = Array.from(el.querySelectorAll("a")) as HTMLAnchorElement[];
      for (const link of links) {
        const href = link.getAttribute("href") ?? "";
        const match = href.match(/^\/groups\/([^/]+)/);
        if (match?.[1]) { setDemoTripId(match[1]); return true; }
      }
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

  // Prefetch the next step's page
  useEffect(() => {
    if (!active) return;
    const nextStep = steps[step + 1];
    if (nextStep?.page) router.prefetch(nextStep.page);
  }, [active, step, steps, router]);

  // Escape key exits the tour
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback((navigateHome = true) => {
    setActive(false);
    setShowCelebration(false);
    localStorage.setItem(DONE_KEY, "1");
    setIsCompleted(true);
    if (navigateHome) router.push("/groups");
  }, [router]);

  const next = useCallback(() => {
    if (step + 1 >= steps.length) {
      // End of the tour → home + celebration
      router.push("/groups");
      setTimeout(() => setShowCelebration(true), 400);
      return;
    }
    setStep((s) => s + 1);
  }, [step, steps.length, router]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => finish(false), [finish]);

  const finishCelebration = useCallback(() => {
    finish(false);
  }, [finish]);

  const start = useCallback((tripId: string | null = null) => {
    localStorage.removeItem(DONE_KEY);
    setIsCompleted(false);
    // Prefer the id passed by the caller (robust); fall back to DOM resolution.
    setDemoTripId(tripId);
    setStep(0);
    setShowCelebration(false);
    setActive(true);
  }, []);

  return (
    <TourContext.Provider
      value={{
        active,
        step,
        totalSteps,
        showCelebration,
        isCompleted,
        start,
        next,
        prev,
        skip,
        finishCelebration,
      }}
    >
      {children}
      {(active || showCelebration) && steps[step] && (
        <TourLayer
          step={steps[step]}
          stepIndex={step}
          totalSteps={totalSteps}
          showCelebration={showCelebration}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
          onCelebrationDone={finishCelebration}
        />
      )}
    </TourContext.Provider>
  );
}
