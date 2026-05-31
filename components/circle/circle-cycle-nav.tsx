"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  groupId:    string;
  prev:       string; // "2026-05"
  current:    string; // "2026-06"
  next:       string; // "2026-07"
  label:      string; // "June 2026"
  canGoNext:  boolean;
}

export function CircleCycleNav({ groupId, prev, current, next, label, canGoNext }: Props) {
  const router = useRouter();

  function go(period: string) {
    router.push(`/groups/${groupId}?period=${period}`);
  }

  return (
    <div className="flex items-center justify-between px-1">
      <button
        type="button"
        onClick={() => go(prev)}
        className="w-8 h-8 flex items-center justify-center rounded-lg
                   text-slate-500 dark:text-slate-400
                   hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Previous cycle"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200" style={{ fontFamily: "var(--font-fraunces)" }}>
        {label}
      </p>

      {canGoNext ? (
        <button
          type="button"
          onClick={() => go(next)}
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Next cycle"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <div className="w-8" /> /* spacer so label stays centred */
      )}
    </div>
  );
}
