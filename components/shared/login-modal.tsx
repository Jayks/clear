"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ClearLogo } from "@/components/shared/clear-logo";
import LoginForm from "@/app/(auth)/login/login-form";

interface LoginModalProps {
  error?: string;
  returnTo?: string;
  intent?: string;
}

export function LoginModal({ error, returnTo, intent }: LoginModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const isSignup = intent === "signup";

  const title = returnTo?.startsWith("/join")
    ? "Sign in to join the group"
    : isSignup
    ? "Create your account"
    : "Sign in to Clear";

  const subtitle = returnTo?.startsWith("/join")
    ? "You'll be taken directly to the group after signing in."
    : isSignup
    ? "Free to get started — no credit card needed."
    : "Split expenses with anyone, anywhere.";

  function close() {
    setIsOpen(false);
    setTimeout(() => {
      if (returnTo?.startsWith("/join/")) {
        // Join preview is a public page — send them there so they can still see it
        router.replace(returnTo);
      } else if (returnTo) {
        // Came here via AutoLoginRedirect (expired session redirected from an app
        // route). router.back() would return to /?returnTo=… which re-mounts
        // AutoLoginRedirect and loops. Navigate to the clean landing page instead.
        router.replace("/");
      } else {
        // User explicitly clicked "Sign in" — go back to wherever they were
        router.back();
      }
    }, 250);
  }

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const formContent = (
    <>
      {error === "auth_callback_failed" && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/50">
          Sign-in failed. Please try again.
        </p>
      )}
      <LoginForm returnTo={returnTo} />
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        // Single motion root — AnimatePresence animates this on unmount.
        // Inner motion elements handle their own enter animations.
        // Exit = unified fade from this wrapper.
        <motion.div
          key="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 pointer-events-none"
        >
          {/* ── Backdrop ─────────────────────────────────────────────────── */}
          <div
            className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-[6px] pointer-events-auto"
            onClick={close}
            aria-hidden="true"
          />

          {/* ── Desktop: centered dialog ─────────────────────────────────── */}
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:flex absolute inset-0 items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="relative w-full max-w-sm pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close pill */}
              <button
                onClick={close}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-md border border-slate-100 dark:border-slate-700 transition-all hover:scale-110"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Logo header */}
              <div className="flex flex-col items-center mb-6">
                <ClearLogo
                  iconSize={64}
                  showWordmark={false}
                  className="mb-4"
                />
                <h1
                  className="text-4xl text-slate-800 dark:text-slate-100"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  Clear
                </h1>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Split it. Clear it.
                </p>
              </div>

              {/* Glass card */}
              <div className="glass rounded-2xl p-8 shadow-2xl shadow-slate-900/10">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  {title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {subtitle}
                </p>
                {formContent}
              </div>

              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
                By signing in you agree to our{" "}
                <a
                  href="/terms"
                  className="underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  terms of service
                </a>
                .
              </p>
            </div>
          </motion.div>

          {/* ── Mobile: bottom sheet ─────────────────────────────────────── */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden absolute bottom-0 inset-x-0 pointer-events-auto bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl shadow-slate-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle row */}
            <div className="flex items-center justify-center pt-3.5 pb-1 relative">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={close}
                className="absolute right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-3 pb-10">
              {/* Logo + title row */}
              <div className="flex items-center gap-3.5 mb-5">
                <ClearLogo iconSize={44} showWordmark={false} className="" />
                <div>
                  <h2
                    className="text-xl text-slate-800 dark:text-slate-100"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {subtitle}
                  </p>
                </div>
              </div>

              {formContent}

              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
                By signing in you agree to our{" "}
                <a
                  href="/terms"
                  className="underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  terms of service
                </a>
                .
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
