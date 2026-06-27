"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";

// ── Developer updates these constants with each major release ──────────────
const CURRENT_VERSION = "2.0";
const WHATS_NEW_COPY  = "Trips, Nests & Circles in sidebar — plus 10 UX improvements";
const WHATS_NEW_HREF  = "/changelog";
// The returning-user threshold: only show to users who first visited >24h ago
const RETURNING_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Slim dismissable banner on the Home page that surfaces the latest feature
 * changelog to returning users. Gated by two localStorage signals:
 *
 * 1. `clear_first_seen` — written once on first Home load (this component or
 *    any other writer in the onboarding workstream). The banner only shows
 *    when this timestamp is >24h old, so new users (who might not yet know
 *    what the "new" features replaced) never see it.
 *
 * 2. `clear_whats_new_seen_{version}` — written on dismiss. A new CURRENT_VERSION
 *    resets the gate for all existing users, showing the banner once for the new
 *    release.
 *
 * Server renders null to avoid SSR mismatch; all localStorage reads happen
 * in a useEffect (same client-only pattern as every other dismissable UI).
 */
export function WhatsNewBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Write / read the first-seen timestamp
    let firstSeen = localStorage.getItem(ONBOARDING_KEYS.FIRST_SEEN);
    if (!firstSeen) {
      localStorage.setItem(ONBOARDING_KEYS.FIRST_SEEN, String(Date.now()));
      firstSeen = String(Date.now());
    }

    const isReturning = Date.now() - Number(firstSeen) > RETURNING_THRESHOLD_MS;
    const alreadySeen =
      localStorage.getItem(ONBOARDING_KEYS.WHATS_NEW_SEEN(CURRENT_VERSION)) === "1";

    if (isReturning && !alreadySeen) setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEYS.WHATS_NEW_SEEN(CURRENT_VERSION), "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="whats-new-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden mb-4"
        >
          <div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
            {/* Link — entire content except the X button */}
            <Link
              href={WHATS_NEW_HREF}
              className="flex items-center gap-2 flex-1 min-w-0 text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
              <span className="text-sm truncate">
                <span className="font-semibold">What&apos;s new in v{CURRENT_VERSION}</span>
                {" — "}
                <span className="opacity-80">{WHATS_NEW_COPY}</span>
              </span>
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400 shrink-0">→</span>
            </Link>

            {/* Dismiss */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss what's new banner"
              className="p-1 rounded-md text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
