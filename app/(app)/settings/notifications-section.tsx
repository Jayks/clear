"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { updateEmailNotificationsAction } from "@/app/actions/user-preferences";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Mail, MailX } from "lucide-react";

interface Props {
  initialEmailEnabled: boolean;
}

export function NotificationsSection({ initialEmailEnabled }: Props) {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushSubscription();
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [emailSaving, setEmailSaving] = useState(false);

  async function toggleEmail(next: boolean) {
    setEmailEnabled(next); // optimistic
    setEmailSaving(true);
    const result = await updateEmailNotificationsAction(next);
    setEmailSaving(false);
    if (!result.ok) {
      setEmailEnabled(!next); // roll back
      toast.error(result.error ?? "Failed to save preference");
    }
  }

  return (
    <div className="space-y-5">
      {!isSupported ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Push notifications are not supported on this device or browser.
        </p>
      ) : permission === "denied" ? (
        <div className="flex items-start gap-3">
          <Smartphone className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Notifications blocked</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Allow notifications in your browser settings to re-enable.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className={`w-4 h-4 shrink-0 ${isSubscribed ? "text-cyan-500" : "text-slate-400 dark:text-slate-500"}`} />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Push notifications</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {/* Push covers all 11 in-app event types (expenses, settlements,
                    disputes, contributions, mentions, …) — not just expenses,
                    so the copy shouldn't narrow it to one event type. */}
                {isSubscribed ? "You'll be notified on this device for group activity — expenses, settlements, disputes, and more." : "Get notified on this device for group activity — expenses, settlements, disputes, and more."}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={(checked) => (checked ? subscribe() : unsubscribe())}
            disabled={isLoading}
            aria-label="Push notifications"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {emailEnabled
            ? <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
            : <MailX className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          }
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Email notifications</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {/* Unlike push, email is only ever sent for one event — a new
                  expense being added — so the copy stays narrow on purpose. */}
              {emailEnabled ? "You'll get an email whenever someone adds a new expense." : "Off by default — turn on to get an email when expenses are added."}
            </p>
          </div>
        </div>
        <Switch
          checked={emailEnabled}
          onCheckedChange={toggleEmail}
          disabled={emailSaving}
          aria-label="Email notifications"
        />
      </div>
    </div>
  );
}
