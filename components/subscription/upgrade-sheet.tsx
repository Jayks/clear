"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { BRAND } from "@/lib/brand";

/**
 * Shared violet ✦ upgrade sheet (RAZORPAY_PLAN.md §10 / M4) — one chrome,
 * reason-specific copy, so every upgrade nudge reads as one coherent offer
 * instead of a scattered paywall. New nudges should add a case to `buildCopy`
 * rather than rolling their own sheet.
 *
 * Deliberately does NOT use `useSheetDismiss` — this sheet is rendered from
 * inside form pages (AddExpenseForm, AddCircleExpenseForm), where that hook's
 * `history.go(-1)` triggers a same-URL `popstate` that Next.js 16 treats as a
 * navigation, wiping form state (see components/CLAUDE.md gotcha). Focus trap
 * + a plain inline Escape listener are both history-independent and safe here.
 */
export type UpgradeReason = "ai" | "group_cap" | "network" | "insights" | "memories";

interface UpgradeSheetContext {
  groupName?: string;
  count?: number;
}

interface UpgradeSheetProps {
  open: boolean;
  reason: UpgradeReason;
  context?: UpgradeSheetContext;
  /** X, backdrop, "Maybe later", or Escape — the offer was declined. */
  onDismiss: () => void;
  /**
   * Called right before navigating to checkout — use it to clear any local
   * "sheet open" state. Navigation to the reason's checkout/upgrade href
   * always happens; this is a side-effect hook, not an override.
   */
  onUpgrade?: () => void;
}

function buildCopy(reason: UpgradeReason, context?: UpgradeSheetContext) {
  switch (reason) {
    case "ai":
      return {
        title: context?.count
          ? `You've scanned ${context.count} receipts${context.groupName ? ` on ${context.groupName}` : ""}! 🎉`
          : "You're scanning like a pro! 🎉",
        body: "Go unlimited and keep every receipt forever — Plus for this trip.",
        cta: "Go Plus for this trip →",
        href: "/upgrade/checkout?passType=pass_30d",
      };
    case "group_cap":
      return {
        title: "You've hit the 5-group free limit.",
        body: "Upgrade for unlimited active groups — nothing gets deleted, just unlocked.",
        cta: "See Plus plans →",
        href: "/upgrade",
      };
    case "network":
      return {
        title: `Your ${BRAND.name} network is waiting.`,
        body: "Add people from past groups in one tap — no re-typing names.",
        cta: "Unlock your network →",
        href: "/upgrade",
      };
    case "insights":
      return {
        title: "Your personal money story is ready.",
        body: "See your real spend across every group, your top categories, and who you share the most with.",
        cta: "See your story →",
        href: "/upgrade",
      };
    case "memories":
      return {
        title: "Keep your trip alive.",
        body: "Upload highlight photos from your trip. Visible to every member.",
        cta: "Go Plus →",
        href: "/upgrade",
      };
  }
}

export function UpgradeSheet({ open, reason, context, onDismiss, onUpgrade }: UpgradeSheetProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

  const copy = buildCopy(reason, context);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUpgrade() {
    onUpgrade?.();
    router.push(copy.href);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* z-50/z-[60] — one tier above the standard z-50 sheet (Sheet primitive,
              QuickAddSheet), same convention as QuestionForm/DisputeForm nesting
              inside ExpenseDetailSheet. This sheet can be shown while a host
              sheet/form is still mounted underneath (see use-ai-upgrade-nudge.tsx). */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Upgrade to ${BRAND.plus}`}
            tabIndex={-1}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-2xl p-6"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))", outline: "none" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close"
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2
                className="text-lg font-semibold text-slate-800 dark:text-slate-100 max-w-xs"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {copy.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{copy.body}</p>
            </div>

            <button
              type="button"
              onClick={handleUpgrade}
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 py-3 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-violet-500/25 transition-all"
            >
              ✦ {copy.cta}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-2.5 w-full py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Maybe later
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
