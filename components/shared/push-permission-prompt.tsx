"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";
import { usePushSubscription } from "@/hooks/use-push-subscription";

const DISMISS_COUNT_KEY = "clear_push_dismiss_count";
const DISMISS_AT_KEY = "clear_push_dismissed_at";
const FIRST_EXPENSE_KEY = "first_expense_added";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isIOSNonStandalone() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIOS && !isStandalone;
}

function shouldShow(permission: NotificationPermission | "unsupported", isSubscribed: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (isIOSNonStandalone()) return false;
  if (isSubscribed) return false;
  if (!localStorage.getItem(FIRST_EXPENSE_KEY)) return false;

  const dismissCount = Number(localStorage.getItem(DISMISS_COUNT_KEY) ?? "0");
  if (dismissCount >= 2) return false;

  if (dismissCount === 1) {
    const dismissedAt = Number(localStorage.getItem(DISMISS_AT_KEY) ?? "0");
    if (Date.now() - dismissedAt < THREE_DAYS_MS) return false;
  }

  // Show for both "default" (can ask) and "denied" (show settings guidance)
  return permission === "default" || permission === "denied";
}

export function PushPermissionPrompt() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushSubscription();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    setShow(shouldShow(permission, isSubscribed));
  }, [isSupported, permission, isSubscribed]);

  function dismiss() {
    const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) ?? "0");
    localStorage.setItem(DISMISS_COUNT_KEY, String(count + 1));
    localStorage.setItem(DISMISS_AT_KEY, String(Date.now()));
    setShow(false);
  }

  async function handleTurnOn() {
    await subscribe();
    setShow(false);
  }

  if (!isSupported) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="fixed bottom-nav-safe md:bottom-6 left-3 right-3 z-[60] md:left-auto md:right-6 md:w-80"
        >
          <div className="glass rounded-2xl px-4 py-3 shadow-lg shadow-black/10">
            {permission === "denied" ? (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <BellOff className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    Notifications blocked
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Enable in your browser settings to get expense alerts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center shadow-sm shadow-cyan-500/30"
                  style={{ background: "linear-gradient(140deg, #0EA5E9 0%, #0891B2 50%, #0D9488 100%)" }}
                >
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    Stay in the loop
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Get notified when group members add expenses.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={handleTurnOn}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 transition-colors disabled:opacity-60"
                  >
                    Turn on
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
