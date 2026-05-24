"use client";

import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Bell, BellOff, BellRing } from "lucide-react";

export function NotificationsSection() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushSubscription();

  if (!isSupported) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Push notifications are not supported on this device or browser.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-start gap-3">
        <BellOff className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Notifications blocked</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Allow notifications in your browser settings to re-enable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isSubscribed
          ? <BellRing className="w-4 h-4 text-cyan-500 shrink-0" />
          : <Bell className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
        }
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Push notifications</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {isSubscribed ? "You'll be notified when expenses are added." : "Get notified when group members add expenses."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
          isSubscribed
            ? "text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            : "text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
        }`}
      >
        {isLoading ? "…" : isSubscribed ? "Turn off" : "Turn on"}
      </button>
    </div>
  );
}
