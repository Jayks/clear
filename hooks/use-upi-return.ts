/**
 * useUpiReturn — detects when the user returns to the PWA from a UPI deep link.
 *
 * Problem solved: when a UPI button is tapped the user is redirected to an
 * external app (GPay / PhonePe / etc.). Showing a 15-second countdown
 * immediately after the tap means the timer expires WHILE the user is in the
 * UPI app, so the confirm prompt auto-dismisses before they ever see it.
 *
 * Solution: the confirm prompt shows in a "waiting" state right away (good UX
 * feedback), but the countdown only starts once the user returns.
 *
 * Return detection sequence:
 *   1. User taps a UPI button → parent sets tapped=true
 *   2. This hook starts listening for visibilitychange + window.focus
 *   3. When the page becomes visible (or regains focus) → timerActive=true
 *   4. 3-second fallback: if the page never went hidden (desktop, failed
 *      deep link, UPI app already open) start the timer after 3s so the user
 *      is never stuck in the "waiting" state indefinitely.
 *
 * Usage:
 *   const { timerActive } = useUpiReturn(upiTapped);
 *   <PaymentConfirmPrompt
 *     isVisible={upiTapped}
 *     timerActive={timerActive}
 *     ...
 *   />
 */

import { useEffect, useState } from "react";

export function useUpiReturn(tapped: boolean): { timerActive: boolean } {
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    // Reset timer state whenever tapped resets to false
    if (!tapped) {
      setTimerActive(false);
      return;
    }

    let activated = false;

    /** Idempotent: once activated, further calls are no-ops */
    const activate = () => {
      if (!activated) {
        activated = true;
        setTimerActive(true);
      }
    };

    const onVisibilityChange = () => {
      // Page became visible = user switched back from UPI app
      if (!document.hidden) activate();
    };

    const onFocus = () => activate();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    // Fallback: page never became hidden (desktop browser, failed deep link,
    // or the UPI app was already in the foreground and completed instantly).
    const fallback = setTimeout(activate, 3000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      clearTimeout(fallback);
    };
  }, [tapped]);

  return { timerActive };
}
