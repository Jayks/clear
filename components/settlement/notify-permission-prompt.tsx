"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";
import { formatCurrency } from "@/lib/utils";
import { usePushSubscription } from "@/hooks/use-push-subscription";

interface Props {
  amountOwedToMe: number;
  currency: string;
}

/**
 * NotifyPermissionPrompt — contextual push-permission nudge shown when the
 * current user is owed money. Appears once (localStorage-gated, site-wide).
 *
 * Uses usePushSubscription().subscribe() directly — that hook already calls
 * Notification.requestPermission() internally, so we must NOT call it again
 * (double-prompt). The prompt dismisses whether the user grants or denies.
 */
export function NotifyPermissionPrompt({ amountOwedToMe, currency }: Props) {
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const { subscribe }           = usePushSubscription();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(ONBOARDING_KEYS.NOTIFY_PROMPTED) === "1") return;
    if (amountOwedToMe <= 0) return;
    setShow(true);
  }, [amountOwedToMe]);

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEYS.NOTIFY_PROMPTED, "1");
    setShow(false);
  }

  async function handleEnable() {
    setLoading(true);
    try {
      await subscribe();
    } catch {
      // subscribe() fails gracefully; the prompt should still dismiss.
    } finally {
      setLoading(false);
      dismiss();
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="glass-sm rounded-xl p-4 mb-4 relative"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss notification prompt"
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center
                       text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                       hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-0.5">
                🔔 Get notified when someone pays you back
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                You&apos;re owed {formatCurrency(amountOwedToMe, currency)} — know the moment it lands.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={loading}
                  className="flex-1 min-h-[36px] text-xs font-semibold text-white
                             bg-gradient-to-br from-emerald-500 to-teal-500
                             hover:from-emerald-600 hover:to-teal-600
                             rounded-lg px-3 transition-all disabled:opacity-60"
                >
                  {loading ? "Enabling…" : "Enable notifications"}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex-1 min-h-[36px] text-xs font-medium text-slate-500 dark:text-slate-400
                             hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
