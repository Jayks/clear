"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WifiOff, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { classifyError } from "@/lib/error-utils";

/**
 * Shared error-boundary card used by every `error.tsx` in the app for a
 * consistent failure experience. Handles:
 *  - classification (offline vs generic vs persistent) via the pure classifier
 *  - retry that ACTUALLY re-runs the server component (router.refresh + reset
 *    inside a transition — reset() alone does not refetch RSC data)
 *  - auto-retry the moment connectivity returns after being offline
 *  - retry-attempt counting so the copy escalates when the DB stays down
 *  - logging to console.error (the observability seam for Vercel logs / Sentry)
 */
export function ErrorCard({
  error,
  reset,
  backHref,
  backLabel = "Back",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [attempts, setAttempts] = useState(0);
  // Assume online during SSR/first paint; corrected in the effect below.
  const [online, setOnline] = useState(true);
  const wasOffline = useRef(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = useCallback(() => {
    setAttempts((n) => n + 1);
    startTransition(() => {
      router.refresh(); // re-runs the server component / re-queries the DB
      reset();          // clears the boundary once the refresh resolves
    });
  }, [router, reset]);

  // Track connectivity. When we come back online after having been offline,
  // retry once automatically — the failure was almost certainly the network.
  useEffect(() => {
    const sync = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline && wasOffline.current) {
        wasOffline.current = false;
        retry();
      } else if (!isOnline) {
        wasOffline.current = true;
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [retry]);

  const info = classifyError(error, online, attempts);
  const Icon = info.kind === "offline" ? WifiOff : AlertTriangle;
  const accent =
    info.kind === "offline"
      ? "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800/40 text-amber-500 dark:text-amber-400"
      : "bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800/40 text-red-500 dark:text-red-400";

  const retrying = isPending;

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div
        className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 ${accent}`}
      >
        <Icon className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
        {info.title}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-6">
        {info.message}
      </p>

      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400
                       hover:text-slate-700 dark:hover:text-slate-200 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        )}
        <button
          onClick={retry}
          disabled={!online || retrying}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500
                     text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm shadow-cyan-500/20
                     hover:from-cyan-600 hover:to-teal-600 transition-all
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
          {!online ? "Waiting for connection…" : retrying ? "Retrying…" : "Try again"}
        </button>
      </div>

      {error.digest && (
        <p className="mt-6 text-[11px] text-slate-400 dark:text-slate-600 font-mono">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
