"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Slim, non-intrusive connectivity strip rendered once in the root layout.
 * Shows an amber bar while offline; flashes a brief "Back online" confirmation
 * when connectivity returns, then auto-hides. Pure client — no SSR output.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let flashTimer: ReturnType<typeof setTimeout> | undefined;

    const goOnline = () => {
      setOnline((prev) => {
        if (!prev) {
          setJustReconnected(true);
          flashTimer = setTimeout(() => setJustReconnected(false), 2500);
        }
        return true;
      });
    };
    const goOffline = () => setOnline(false);

    // Initialise from the live value (SSR assumed online).
    setOnline(navigator.onLine);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, []);

  if (online && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2
                  px-4 py-2 text-xs font-medium text-white text-center
                  transition-colors duration-300
                  ${online ? "bg-emerald-500" : "bg-amber-500"}`}
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      {online ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          Back online
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          No internet connection — some actions may not work
        </>
      )}
    </div>
  );
}
