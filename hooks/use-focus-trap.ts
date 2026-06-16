import { useEffect, useRef, type RefObject } from "react";
import { resolveFocusTrap } from "@/components/shared/sheet-focus";

/**
 * Traps keyboard focus inside an open dialog/sheet panel (WCAG 2.4.3 / 2.1.2)
 * and restores focus to the trigger on close. History-independent — unlike
 * `useSheetDismiss` it manipulates no browser history, so it is safe even inside
 * form-page sheets where `useSheetDismiss` is banned.
 *
 * Usage:
 *   const panelRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(isOpen, panelRef);
 *   // ...attach ref to the panel element; give it role="dialog" + aria-modal.
 *
 * On open: remembers the focused element, then moves focus into the panel —
 * respecting any inner element that already grabbed focus (e.g. an autoFocus
 * input), otherwise focusing the panel container itself so the mobile keyboard
 * is never popped unprompted. Tab / Shift+Tab then wrap within the panel. On
 * close (or unmount) focus returns to the trigger.
 *
 * Nesting: a module-level stack ensures that when one trapped sheet opens another
 * (e.g. ExpenseDetailSheet → DisputeForm, which portals OUTSIDE the detail panel),
 * only the topmost trap handles Tab. The lower trap stays registered (so it never
 * prematurely restores focus) but goes dormant until the inner one closes.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Visible, focusable descendants in DOM/tab order. getClientRects() is used for
// the visibility check (not offsetParent, which is null for position:fixed
// ancestors like a sheet panel — that would wrongly exclude everything).
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.getClientRects().length > 0);
}

// Active traps, innermost last. Only the top entry reacts to Tab / focus-in.
const trapStack: symbol[] = [];

export function useFocusTrap(
  active: boolean,
  panelRef: RefObject<HTMLElement | null>,
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol("focus-trap");

  useEffect(() => {
    if (!active) return;
    const id = idRef.current!;
    trapStack.push(id);
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const isTop = () => trapStack[trapStack.length - 1] === id;

    // Defer one frame so a panel rendered in the same commit is in the DOM.
    const raf = requestAnimationFrame(() => {
      if (!isTop()) return;
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return; // respect inner autoFocus
      if (!panel.hasAttribute("tabindex")) panel.tabIndex = -1;
      panel.style.outline = "none";
      panel.focus({ preventScroll: true });
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !isTop()) return; // only the innermost trap acts
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusable(panel);
      if (focusables.length === 0) { e.preventDefault(); panel.focus({ preventScroll: true }); return; }
      const activeIndex = focusables.indexOf(document.activeElement as HTMLElement);
      const target = resolveFocusTrap(focusables.length, activeIndex, e.shiftKey);
      if (target !== null) { e.preventDefault(); focusables[target].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      const idx = trapStack.lastIndexOf(id);
      if (idx !== -1) trapStack.splice(idx, 1);
      const trigger = previouslyFocused.current;
      if (trigger && typeof trigger.focus === "function" && trigger.isConnected) {
        trigger.focus();
      }
    };
  }, [active, panelRef]);
}
