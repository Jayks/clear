"use client";

import { useState, useEffect } from "react";

export type PushPermission = NotificationPermission | "unsupported";

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    setIsSupported(true);
    setPermission(Notification.permission);

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  async function subscribe() {
    if (!isSupported) return;
    setIsLoading(true);
    // Optimistic — the switch flips on immediately instead of waiting out
    // the native permission dialog + push-service round trip + server save;
    // rolled back to false below if any step doesn't actually succeed.
    setIsSubscribed(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setIsSubscribed(false); // rollback — user denied the prompt
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
    } catch {
      setIsSubscribed(false); // rollback — subscribe or server save failed
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribe() {
    if (!isSupported) return;
    setIsLoading(true);
    // Optimistic — mirrors subscribe(); rolled back to true only if the
    // browser-side unsubscribe itself fails (a failed *server* cleanup
    // below is deliberately not rolled back — the browser really is
    // unsubscribed at that point, so "off" is still the accurate state).
    setIsSubscribed(false);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch((e) => {
          // Log but don't block — browser is already unsubscribed locally;
          // ghost subscription in DB will fail-deliver and auto-prune on next push
          console.error("[push] Failed to remove server subscription:", e);
        });
      }
    } catch (e) {
      console.error("[push] Unsubscribe error:", e);
      setIsSubscribed(true); // rollback — the browser-side unsubscribe failed
    } finally {
      setIsLoading(false);
    }
  }

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
