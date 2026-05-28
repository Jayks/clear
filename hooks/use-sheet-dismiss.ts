import { useEffect } from "react";

/**
 * Adds Escape key + Android/browser back-button dismissal to a bottom sheet.
 *
 * When the sheet opens, a fake history entry is pushed so the hardware/browser
 * back button closes it rather than navigating away. If the sheet is closed
 * programmatically (Cancel, backdrop, swipe) the fake entry is silently popped.
 *
 * Usage:
 *   useSheetDismiss(open, onClose);
 *   // onClose must be the same stable reference (useCallback or setState setter)
 */
export function useSheetDismiss(open: boolean, onClose: () => void) {
  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Back button — push fake history entry on open, pop it on close
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ bottomSheet: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed programmatically — pop the fake entry so history stays clean
      if (window.history.state?.bottomSheet) window.history.go(-1);
    };
  }, [open, onClose]);
}
