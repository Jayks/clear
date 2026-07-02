"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building2, Coins, ChevronRight, Loader2, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getContextTheme } from "@/lib/theme/context-theme";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useSwitcherGroups } from "@/hooks/use-switcher-groups";
import { typeLabel, targetHref, stashSwitcherSection } from "@/lib/nav/group-switcher";

/**
 * In-group group switcher. Opened by tapping the group name (▾) in the
 * GroupMobileNav header — available on the overview + all section pages. Lazily
 * fetches the user's active groups on first open (no cost on normal page loads).
 *
 * Section-preserving: switching from e.g. Settle lands on the target group's
 * Settle — UNLESS the target is a Circle (no Settle/Insights), which falls back
 * to that circle's overview. Overview/Expenses/Members exist for every type.
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentGroupId: string;
  /** "" overview · "expenses" · "settle" · "members" · "insights" */
  currentSection: string;
}

const TYPE_ICON: Record<string, LucideIcon> = { trip: MapPin, nest: Building2, circle: Coins };

export function GroupSwitcherSheet({ isOpen, onClose, currentGroupId, currentSection }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { groups, ensureLoaded } = useSwitcherGroups();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useFocusTrap(isOpen, panelRef);

  // Escape to close — deliberately NOT useSheetDismiss: this sheet's primary
  // action is to navigate to another group, and useSheetDismiss's fake history
  // entry would pollute the back stack on selection. Backdrop + Done also close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lazy-fetch the group list the first time the sheet opens.
  useEffect(() => {
    if (isOpen) ensureLoaded();
  }, [isOpen, ensureLoaded]);

  if (!mounted) return null;

  const others = (groups ?? []).filter((g) => g.id !== currentGroupId);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Switch group"
            tabIndex={-1}
            style={{ outline: "none" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[80vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 shrink-0">
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
                Switch group
              </p>
              <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm px-2 py-1">
                Done
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-3 pb-2 min-h-0">
              {groups === null ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : others.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">No other groups yet.</p>
              ) : (
                others.map((g) => {
                  const theme = getContextTheme(g.groupType, g.circleMode);
                  const Icon = TYPE_ICON[g.groupType] ?? MapPin;
                  const isSwitching = switchingId === g.id;
                  const sectionHref  = targetHref(g.id, currentSection, g.groupType);
                  const overviewHref = `/groups/${g.id}`;
                  return (
                    <Link
                      key={g.id}
                      href={sectionHref}
                      onClick={(e) => {
                        e.preventDefault();
                        setSwitchingId(g.id);

                        // sessionStorage two-step navigation (only needed when a section
                        // is actually kept):
                        //   1. Store the target section so GroupMobileNav can push it
                        //      after it lands on the overview.
                        //   2. replace → commits /groups/B overview into history.
                        //   3. GroupMobileNav useEffect fires on /groups/B, reads the
                        //      stored section, clears it, and pushes /groups/B/section.
                        //
                        // Resulting history: [..., /groups/A/X, /groups/B, /groups/B/X]
                        // Browser back → /groups/B overview ✓
                        //
                        // Why not setTimeout(0)? App Router may cancel the replace when
                        // the push fires before it commits — sessionStorage decouples the
                        // two navigations so they can't race.
                        if (sectionHref !== overviewHref) {
                          stashSwitcherSection(g.id, sectionHref.slice(overviewHref.length + 1));
                        }
                        router.replace(overviewHref);
                      }}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{g.name}</p>
                        <p className={`text-xs ${theme.accentText} truncate`}>{typeLabel(g)}</p>
                      </div>
                      {isSwitching ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 shrink-0">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Switching…
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      )}
                    </Link>
                  );
                })
              )}
            </div>

            {/* Footer — escape to the full Home list */}
            <div className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-slate-800 shrink-0">
              <Link
                href="/groups"
                onClick={() => setSwitchingId("__home__")}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">All groups</span>
                {switchingId === "__home__" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                )}
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
