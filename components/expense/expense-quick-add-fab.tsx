"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Camera, Mic, Sparkles } from "lucide-react";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";
import type { LucideIcon } from "lucide-react";
import type { GroupMember } from "@/lib/db/schema/group-members";
import { QuickAddSheet } from "./quick-add-sheet";
import { getContextTheme } from "@/lib/theme/context-theme";
import { hapticLight } from "@/lib/haptics";

type StartMode = "text" | "voice" | "scan";

interface Props {
  groupId: string;
  groupName: string;
  groupType: string;
  circleMode?: string | null;
  currency: string;
  members: GroupMember[];
  groupStartDate?: string | null;
  groupEndDate?: string | null;
  isPlusUser?: boolean;
  /** When true, shows a pulsing cyan dot on the Scan FAB button to surface
   *  AI receipt scanning to users who have been logging manually (>= 3 expenses). */
  showScanGlow?: boolean;
}

// The three input methods share the same palette + icons as GroupActionHub's
// "Log expense" tiles, so the method language is identical everywhere.
// Order is bottom-to-top in the fan: Type (primary) closest to the main FAB.
const METHODS: { mode: StartMode; label: string; icon: LucideIcon; gradient: string; shadow: string }[] = [
  { mode: "text",  label: "Type",  icon: Sparkles, gradient: "from-cyan-500 to-teal-500",     shadow: "shadow-cyan-500/30"   },
  { mode: "voice", label: "Voice", icon: Mic,      gradient: "from-rose-500 to-pink-500",     shadow: "shadow-rose-500/30"   },
  { mode: "scan",  label: "Scan",  icon: Camera,   gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/30" },
];

export function ExpenseQuickAddFab({
  groupId,
  groupName,
  groupType,
  circleMode,
  currency,
  members,
  groupStartDate,
  groupEndDate,
  isPlusUser = false,
  showScanGlow = false,
}: Props) {
  const [fabOpen, setFabOpen]         = useState(false);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [startMode, setStartMode]     = useState<StartMode>("text");
  const [glowDismissed, setGlowDismissed] = useState(true);
  const theme = getContextTheme(groupType, circleMode);

  useEffect(() => {
    if (!showScanGlow) return;
    const dismissed =
      localStorage.getItem(ONBOARDING_KEYS.SCAN_GLOW_DISMISSED) === "1";
    setGlowDismissed(dismissed);
  }, [showScanGlow]);

  function pick(mode: StartMode) {
    hapticLight();
    if (mode === "scan" && showScanGlow && !glowDismissed) {
      localStorage.setItem(ONBOARDING_KEYS.SCAN_GLOW_DISMISSED, "1");
      setGlowDismissed(true);
    }
    setStartMode(mode);
    setFabOpen(false);
    setSheetOpen(true);
  }

  return (
    <>
      {/* Backdrop — closes the fan */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setFabOpen(false)}
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-[1.5px] z-40"
          />
        )}
      </AnimatePresence>

      {/* FAB stack — flex-col-reverse: main FAB at bottom, methods fan upward */}
      <div className="md:hidden fixed bottom-nav-safe right-4 z-50 flex flex-col-reverse items-end gap-3 pointer-events-none">
        {/* Main FAB — context colour */}
        <motion.button
          type="button"
          onClick={() => { hapticLight(); setFabOpen((v) => !v); }}
          animate={{ rotate: fabOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-label={fabOpen ? "Close" : "Add expense"}
          className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center
                     bg-gradient-to-br ${theme.gradient} shadow-xl ${theme.glow} text-white
                     hover:brightness-105 active:scale-95 transition-all`}
        >
          <Plus className="w-6 h-6" />
        </motion.button>

        {/* Method fan */}
        <AnimatePresence>
          {fabOpen && METHODS.map(({ mode, label, icon: Icon, gradient, shadow }, i) => (
            <motion.div
              key={mode}
              initial={{ scale: 0, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 18 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 420, damping: 26 }}
              className="flex items-center gap-3 pointer-events-auto"
            >
              <motion.span
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.05 + 0.07, duration: 0.18 }}
                className="text-[13px] font-medium text-white bg-slate-900/78 dark:bg-slate-800/90
                           backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md whitespace-nowrap select-none"
              >
                {label}
              </motion.span>
              <button
                type="button"
                onClick={() => pick(mode)}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center
                            bg-gradient-to-br ${gradient} shadow-lg ${shadow} text-white
                            hover:brightness-105 active:scale-95 transition-all`}
              >
                {mode === "scan" && showScanGlow && !glowDismissed && (
                  <span className="absolute -top-1 -right-1 z-10 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                  </span>
                )}
                <Icon className="w-[18px] h-[18px]" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <QuickAddSheet
        groupId={groupId}
        groupName={groupName}
        groupType={groupType}
        currency={currency}
        isOpen={sheetOpen}
        members={members}
        groupStartDate={groupStartDate}
        groupEndDate={groupEndDate}
        onClose={() => setSheetOpen(false)}
        isPlusUser={isPlusUser}
        startMode={startMode}
      />
    </>
  );
}
