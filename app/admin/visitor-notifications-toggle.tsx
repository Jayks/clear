"use client";

import { useState, useTransition } from "react";
import { toggleVisitorNotifications } from "@/app/actions/admin";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export function VisitorNotificationsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await toggleVisitorNotifications(next);
      if (!result.ok) {
        setEnabled(!next);
        toast.error("Failed to update setting");
      } else {
        toast.success(next ? "Visitor notifications enabled" : "Visitor notifications paused");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-60"
    >
      <div className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-600"}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </div>
      <span className={enabled ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}>
        {enabled ? "On" : "Paused"}
      </span>
    </button>
  );
}
