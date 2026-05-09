"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

interface CountUpProps {
  value: number;
  currency?: string;      // if provided → currency format; omit → integer
  locale?: string;
  className?: string;
  duration?: number;
}

export function CountUp({ value, currency, locale = "en-IN", className, duration = 0.6 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  const fmt = (n: number) =>
    currency
      ? new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n)
      : Math.round(n).toLocaleString(locale);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => { el.textContent = fmt(v); },
    });
    return () => controls.stop();
  }, [value, currency, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref} className={className}>{fmt(0)}</span>;
}
