"use client";

import { useEffect, useState } from "react";
import { Camera, Mic, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";

/** The expense input mode a quick-add flow should start in. */
export type StartMode = "text" | "voice" | "scan";

// Single source of truth for the three "Log expense" methods. The palette +
// icons match the ExpenseQuickAddFab fan and the GroupActionHub tiles so the
// method language is identical everywhere a user logs an expense.
const TILES: {
  id: StartMode;
  icon: LucideIcon;
  label: string;
  sub: string;
  gradient: string;
  shadow: string;
}[] = [
  { id: "scan",  icon: Camera,   label: "Scan",  sub: "Receipt",   gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/30" },
  { id: "voice", icon: Mic,      label: "Voice", sub: "Speak it",  gradient: "from-rose-500 to-pink-500",     shadow: "shadow-rose-500/30"  },
  { id: "text",  icon: Sparkles, label: "Type",  sub: "AI parses", gradient: "from-cyan-500 to-teal-500",     shadow: "shadow-cyan-500/30"  },
];

/**
 * The 3-tile Scan / Voice / Type chooser used by `GroupActionHub` Zone 1 and the
 * `GlobalFab` post-group-pick step, so the "how do you want to log?" surface is
 * identical across entry points. Each tile calls `onPick(mode)`; the caller opens
 * `QuickAddSheet` with that `startMode`.
 *
 * `showScanGlow` — when true and the user hasn't tapped Scan before, a pulsing
 * cyan dot appears on the Scan tile to signal that AI receipt scanning exists.
 * The glow is dismissed (localStorage-gated) the first time Scan is tapped.
 */
export function LogExpenseTiles({
  onPick,
  showScanGlow = false,
  className = "",
}: {
  onPick: (mode: StartMode) => void;
  showScanGlow?: boolean;
  className?: string;
}) {
  // glowDismissed defaults true (hidden) until we read localStorage client-side.
  const [glowDismissed, setGlowDismissed] = useState(true);

  useEffect(() => {
    if (!showScanGlow) return;
    const dismissed =
      localStorage.getItem(ONBOARDING_KEYS.SCAN_GLOW_DISMISSED) === "1";
    setGlowDismissed(dismissed);
  }, [showScanGlow]);

  function handlePick(mode: StartMode) {
    if (mode === "scan" && showScanGlow && !glowDismissed) {
      localStorage.setItem(ONBOARDING_KEYS.SCAN_GLOW_DISMISSED, "1");
      setGlowDismissed(true);
    }
    onPick(mode);
  }

  return (
    <div className={`grid grid-cols-3 gap-2.5 ${className}`}>
      {TILES.map(({ id, icon: Icon, label, sub, gradient, shadow }) => {
        const isScan = id === "scan";
        const showDot = isScan && showScanGlow && !glowDismissed;
        return (
          <button
            key={id}
            type="button"
            onClick={() => handlePick(id)}
            className="relative flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-center"
          >
            {/* Pulsing glow dot — signals AI receipt scanning to first-time users */}
            {showDot && (
              <span className="absolute -top-1 -right-1 z-10 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
            )}
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm ${shadow}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">{label}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">{sub}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
