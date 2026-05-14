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
import { toast } from "sonner";
import { getTourSteps } from "@/lib/tour/steps";
import { TourLayer } from "./tour-layer";

const DONE_KEY = "clear_tour_done";

interface TourContextValue {
  active: boolean;
  step: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
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
  const [demoTripId, setDemoTripId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const steps = getTourSteps(demoTripId);

  // Auto-launch for users who haven't completed the tour.
  useEffect(() => {
    if (!localStorage.getItem(DONE_KEY)) {
      setActive(true);
    }
  }, []);

  // Read the demo trip ID from the demo-trip card's Link href.
  // Runs on pathname/step change and retries after a delay to handle the
  // /groups loading skeleton (card isn't in the DOM until the server data resolves).
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

  // Navigate to the step's required page when the step changes.
  useEffect(() => {
    if (!active) return;
    const currentStep = steps[step];
    if (currentStep?.page && pathname !== currentStep.page) {
      router.push(currentStep.page);
    }
  }, [active, step, pathname, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch the next step's page while the user reads the current step.
  useEffect(() => {
    if (!active) return;
    const nextStep = steps[step + 1];
    if (nextStep?.page) {
      router.prefetch(nextStep.page);
    }
  }, [active, step, steps, router]);

  // Prefetch all inner trip pages as soon as the demo trip ID is known.
  useEffect(() => {
    if (!active || !demoTripId) return;
    const base = `/groups/${demoTripId}`;
    [base, `${base}/expenses`, `${base}/settle`, `${base}/insights`].forEach(
      (p) => router.prefetch(p)
    );
  }, [active, demoTripId, router]);

  const finish = useCallback((navigateHome = true) => {
    setActive(false);
    localStorage.setItem(DONE_KEY, "1");
    if (navigateHome) {
      router.push("/groups");
      toast.success("You know the ropes — go split it. Clear it.", {
        action: { label: "New group", onClick: () => router.push("/groups/new") },
        duration: 5000,
      });
    }
  }, [router]);

  const next = useCallback(() => {
    if (step + 1 >= steps.length) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }, [step, steps.length, finish]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => finish(false), [finish]);

  const start = useCallback(() => {
    localStorage.removeItem(DONE_KEY);
    setDemoTripId(null);
    setStep(0);
    setActive(true);
  }, []);

  return (
    <TourContext.Provider
      value={{ active, step, totalSteps: steps.length, start, next, prev, skip }}
    >
      {children}
      {active && steps[step] && (
        <TourLayer
          step={steps[step]}
          stepIndex={step}
          totalSteps={steps.length}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
        />
      )}
    </TourContext.Provider>
  );
}
