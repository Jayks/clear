"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";

// Shared bottom-sheet primitive. Owns the visual shell (backdrop + slide-up
// panel), the standardized spring, drag-to-dismiss, Escape, and the iOS
// touchmove scroll-lock. It deliberately does NOT manage browser-history /
// back-button — that stays with each caller, because some sheets need a
// replaceState escape-hatch before navigating (and form-page sheets must avoid
// the go(-1) RSC-refresh trap entirely). See CLAUDE.md "useSheetDismiss" gotcha.
//
// Structure is two layers: an OUTER wrapper owns the enter/exit slide via
// AnimatePresence; an INNER panel owns the drag offset via a motion value.
// Keeping them separate avoids the classic conflict where `animate={{ y: 0 }}`
// and drag fight over the same transform (a sub-threshold drag then fails to
// spring back). Snap-back is an explicit animate() — the same pattern the swipe
// cards use elsewhere in this codebase.

// Single source of truth for the sheet spring. Was drifting across ~15
// hand-rolled sheets (300/30, 320/28, 380/30, 280/28); 300/30 is what most used.
export const SHEET_SPRING = { type: "spring" as const, damping: 30, stiffness: 300 };

// Drag-to-dismiss thresholds — release past either and the sheet closes.
const DISMISS_OFFSET_PX = 110;
const DISMISS_VELOCITY  = 600;

interface SheetProps {
  isOpen:   boolean;
  onClose:  () => void;
  children: React.ReactNode;
  /** Extra classes appended to the panel (e.g. max-height / overflow). */
  panelClassName?: string;
  /** Scrollable region inside children that should be exempt from the iOS
   *  touchmove lock so it can scroll natively. */
  scrollRef?: RefObject<HTMLDivElement | null>;
  /** Hide the grab handle and disable drag-to-dismiss. Default true. */
  draggable?: boolean;
  ariaLabel?: string;
  /** Optional data-tour anchor placed on the panel (for the onboarding tour). */
  dataTour?: string;
}

export function Sheet({
  isOpen, onClose, children,
  panelClassName = "",
  scrollRef,
  draggable = true,
  ariaLabel,
  dataTour,
}: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const dragControls          = useDragControls();
  const dragY                 = useMotionValue(0);
  const onCloseRef            = useRef(onClose);
  const panelRef              = useRef<HTMLDivElement>(null);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // WCAG focus management — trap Tab inside the open panel + restore focus to the
  // trigger on close. `isOpen && mounted` so focus-in waits for the portal/panel.
  useFocusTrap(isOpen && mounted, panelRef);

  useEffect(() => setMounted(true), []);

  // Reset the drag offset whenever the sheet (re)opens — a drag-dismiss leaves
  // dragY at a positive value; without this the next open starts displaced.
  useEffect(() => { if (isOpen) dragY.set(0); }, [isOpen, dragY]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // iOS: block body scroll-through; allow native scroll inside the opt-in region.
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: TouchEvent) => {
      const el = scrollRef?.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isOpen, scrollRef]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Outer: presence slide + positioning (NOT draggable) */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SHEET_SPRING}
          >
            {/* Inner: chrome + drag offset */}
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              tabIndex={-1}
              data-tour={dataTour}
              style={{ y: dragY, outline: "none" }}
              className={`rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl ${panelClassName}`}
              drag={draggable ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) {
                  onCloseRef.current();
                } else {
                  animate(dragY, 0, SHEET_SPRING);
                }
              }}
            >
              {draggable && (
                // Grab handle — the only drag trigger, so dragging never steals
                // scroll from content. touch-none lets the pointer start a drag
                // instead of scrolling.
                <div
                  className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>
              )}
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
