"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share } from "lucide-react";
import { ClearIcon } from "@/components/shared/clear-logo";

const IOS_DISMISSED_KEY = "clear_ios_hint_dismissed";
const ANDROID_DISMISSED_KEY = "clear_android_install_dismissed";

// Chrome / Edge / Samsung Browser fire this event before showing their own mini-infobar.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Detect iOS Safari (including iPadOS 13+ which switched to a Macintosh UA).
 * The secondary check (Macintosh + maxTouchPoints > 1) catches modern iPads that
 * no longer include "iPad" in their UA string.
 */
function isIOSSafari() {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Exclude WebViews and non-Safari iOS browsers
  const isSafari =
    /safari/i.test(ua) && !/chrome|chromium|crios|fxios|android/i.test(ua);
  return isIOS && isSafari;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Shows a bottom-anchored install hint.
 * - iOS Safari (incl. iPadOS 13+): "Tap Share → Add to Home Screen" instructions.
 * - Android Chrome / Edge / Samsung (beforeinstallprompt): "Install" button that
 *   triggers the browser's native install flow.
 */
export function IOSInstallHint() {
  const [showIOS, setShowIOS] = useState(false);
  const [showAndroid, setShowAndroid] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    // iOS Safari — no beforeinstallprompt support; show manual instructions.
    if (isIOSSafari()) {
      if (localStorage.getItem(IOS_DISMISSED_KEY) !== "1") setShowIOS(true);
      // Don't wire up the Android listener on iOS.
      return;
    }

    // Android / Desktop Chrome — wait for the deferred prompt.
    if (localStorage.getItem(ANDROID_DISMISSED_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // Suppress Chrome's own mini-infobar
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setShowAndroid(true);
    };
    const onInstalled = () => {
      // App was installed through some other path — hide the hint.
      setShowAndroid(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismissIOS() {
    localStorage.setItem(IOS_DISMISSED_KEY, "1");
    setShowIOS(false);
  }

  function dismissAndroid() {
    localStorage.setItem(ANDROID_DISMISSED_KEY, "1");
    setShowAndroid(false);
  }

  async function handleInstall() {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPromptRef.current = null;
    setShowAndroid(false);
    if (outcome === "accepted") {
      localStorage.setItem(ANDROID_DISMISSED_KEY, "1");
    }
  }

  const show = showIOS || showAndroid;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="pwa-hint"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="fixed bottom-nav-safe md:bottom-6 left-3 right-3 z-[60]"
        >
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-black/10">
            {/* App icon */}
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm shadow-cyan-500/30"
              style={{ background: "linear-gradient(140deg, #22D3EE 0%, #0BB6D4 42%, #0E8FA8 78%, #0B5E70 100%)" }}
            >
              <ClearIcon size={26} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                Install Clear
              </p>
              {showIOS ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Tap{" "}
                  <Share className="inline w-3.5 h-3.5 mx-0.5 relative -top-px text-cyan-600 dark:text-cyan-400" />
                  {" "}then{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Add to Home Screen
                  </span>
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Get the app for a faster experience
                </p>
              )}
            </div>

            {/* Android: Install button */}
            {showAndroid && (
              <button
                type="button"
                onClick={handleInstall}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-xs font-medium shadow-sm shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 transition-all"
              >
                Install
              </button>
            )}

            {/* Dismiss */}
            <button
              type="button"
              onClick={showIOS ? dismissIOS : dismissAndroid}
              aria-label="Dismiss"
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
