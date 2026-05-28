import { useEffect, useRef } from "react";

/**
 * Adds Escape key + Android/browser back-button dismissal to a bottom sheet.
 *
 * When the sheet opens a fake history entry is pushed so the hardware back
 * button closes the sheet rather than navigating away. When the sheet is
 * closed programmatically (Cancel, backdrop, swipe), the fake entry is
 * silently popped via history.go(-1).
 *
 * Usage:
 *   useSheetDismiss(open, onClose);
 *   // onClose does NOT need to be a stable reference — handled internally.
 *
 * Race-condition note: when a conditionally-rendered sheet unmounts, its
 * cleanup fires go(-1) asynchronously. If the sheet re-mounts before the
 * resulting popstate fires, the new listener would see it and call onClose,
 * closing the sheet immediately. isPoppingRef guards against this: the
 * cleanup sets it true, the new listener ignores the popstate and resets it,
 * and a 100 ms setTimeout resets it if no new listener was ever attached.
 */
export function useSheetDismiss(open: boolean, onClose: () => void) {
  // Always hold the latest onClose so effects don't re-run when the prop changes.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  // Shared flag: true while our own programmatic go(-1) is in-flight.
  const isPoppingRef = useRef(false);

  // Escape key — only re-runs when open changes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Back button — push fake history entry on open, pop it on programmatic close.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ bottomSheet: true }, "");

    const onPop = () => {
      if (isPoppingRef.current) {
        // This popstate is from our own cleanup go(-1), not the user — ignore.
        isPoppingRef.current = false;
        return;
      }
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.bottomSheet) {
        isPoppingRef.current = true;
        window.history.go(-1);
        // Safety: if no new listener mounts to consume the popstate (e.g. the
        // sheet closed and was not reopened), reset the flag so future opens
        // don't silently swallow the first hardware back press.
        setTimeout(() => { isPoppingRef.current = false; }, 100);
      }
    };
  }, [open]);
}
