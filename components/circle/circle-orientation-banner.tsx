"use client";

import { useEffect, useState } from "react";
import { Coins, Landmark, X, ArrowRight } from "lucide-react";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";
import { formatCurrency } from "@/lib/utils";

interface Props {
  groupId: string;
  groupName: string;
  isAdmin: boolean;
  circleMode: "recurring" | "one_time";
  contributionAmount: number | null;
  currency: string;
  /**
   * True on the post-join first render (?welcome=1). Suppresses this banner
   * so it doesn't stack with WelcomeBanner. The user will see it on their
   * NEXT visit — its localStorage key is not yet written.
   */
  hideOrientationBanner?: boolean;
}

export function CircleOrientationBanner({
  groupId,
  groupName,
  isAdmin,
  circleMode,
  contributionAmount,
  currency,
  hideOrientationBanner = false,
}: Props) {
  // Server renders null to avoid SSR/client mismatch flash.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Suppressed on post-join render — WelcomeBanner covers orientation that day.
    if (hideOrientationBanner) return;

    const key = isAdmin
      ? ONBOARDING_KEYS.CIRCLE_ORIENT_ADMIN(groupId)
      : ONBOARDING_KEYS.CIRCLE_ORIENT_MEMBER(groupId);
    const already = localStorage.getItem(key) === "1";
    if (!already) setDismissed(false);
  }, [groupId, isAdmin, hideOrientationBanner]);

  function dismiss() {
    const key = isAdmin
      ? ONBOARDING_KEYS.CIRCLE_ORIENT_ADMIN(groupId)
      : ONBOARDING_KEYS.CIRCLE_ORIENT_MEMBER(groupId);
    localStorage.setItem(key, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  const isRecurring = circleMode === "recurring";
  const isFixed     = !isRecurring && contributionAmount !== null;
  const isFlexi     = !isRecurring && contributionAmount === null;

  // Mode summary line
  let modeLine = "";
  if (isRecurring) {
    modeLine = contributionAmount !== null
      ? `Members contribute ${formatCurrency(contributionAmount, currency)}/month · you confirm each payment`
      : `Members contribute each month · you confirm each payment`;
  } else if (isFixed) {
    modeLine = `Each member contributes ${formatCurrency(contributionAmount ?? 0, currency)} · you confirm and draw from the wallet`;
  } else if (isFlexi) {
    modeLine = "Members contribute any amount · you confirm and draw from the wallet";
  }

  // Accent: violet for recurring, amber for one-time
  const accentBorder = isRecurring ? "border-violet-500" : "border-amber-500";
  const badgeBg      = isRecurring ? "bg-violet-50 dark:bg-violet-900/30" : "bg-amber-50 dark:bg-amber-900/30";
  const iconColor    = isRecurring ? "text-violet-500 dark:text-violet-400" : "text-amber-500 dark:text-amber-400";
  const ctaColor     = isRecurring
    ? "bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
    : "bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600";

  return (
    <div className={`glass rounded-2xl p-4 mb-6 relative border-l-4 ${accentBorder}`}>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss orientation banner"
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                   text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                   hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className={`w-9 h-9 rounded-xl ${badgeBg} flex items-center justify-center shrink-0 mt-0.5`}>
          {isAdmin ? (
            <Landmark className={`w-4.5 h-4.5 ${iconColor}`} />
          ) : (
            <Coins className={`w-4.5 h-4.5 ${iconColor}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isAdmin ? (
            <>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                🏦 You&apos;re managing this Circle
              </p>
              <ul className="space-y-1 mb-2">
                {[
                  "Record when members contribute",
                  "Log wallet expenses (shared draws)",
                  "Send reminders to pending members",
                ].map((item) => (
                  <li key={item} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <span className="text-slate-300 dark:text-slate-600 mt-px">·</span>
                    {item}
                  </li>
                ))}
              </ul>
              {modeLine && (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-3">
                  {modeLine}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                👛 Welcome to {groupName}
              </p>
              <ul className="space-y-1 mb-3">
                {[
                  isFlexi
                    ? "Contribute any amount you'd like"
                    : "Tap \"I've paid\" when you contribute",
                  "The admin confirms your payment",
                  "Watch the shared wallet grow 📈",
                ].map((item) => (
                  <li key={item} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <span className="text-slate-300 dark:text-slate-600 mt-px">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              dismiss();
              // Scroll to the contribution roster after dismissing
              const roster = document.getElementById("contribution-roster");
              if (roster) roster.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg min-h-[32px] transition-all ${ctaColor}`}
          >
            Got it →
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
