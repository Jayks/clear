"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { resolveCountUp } from "./count-up-logic";

interface CountUpProps {
  value: number;
  currency?: string;           // if provided → currency format; omit → integer
  locale?: string;
  className?: string;
  duration?: number;
  maximumFractionDigits?: number;  // default 2 for currency, 0 for integers
}

export function CountUp({ value, currency, locale = "en-IN", className, duration = 0.6, maximumFractionDigits }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef<number | null>(null);   // last value seen — survives router.refresh() re-renders
  const reduceMotion = useReducedMotion() ?? false;

  const fmt = (n: number) =>
    currency
      ? new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: maximumFractionDigits ?? 2 }).format(n)
      : Math.round(n).toLocaleString(locale);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const { from, animate: shouldAnimate } = resolveCountUp(prevRef.current, value, reduceMotion);
    prevRef.current = value;

    if (!shouldAnimate) {
      el.textContent = fmt(value);
      return;
    }

    const controls = animate(from, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => { el.textContent = fmt(v); },
    });
    return () => controls.stop();
  }, [value, currency, duration, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref} className={className}>{fmt(0)}</span>;
}
