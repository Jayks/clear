"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Home, Coins, X, ArrowRight } from "lucide-react";
import { ONBOARDING_KEYS } from "@/lib/onboarding-keys";
import { formatCurrency } from "@/lib/utils";

interface Props {
  groupId: string;
  groupName: string;
  groupType: "trip" | "nest" | "circle";
  creatorName: string;
  expenseCount: number;
  memberCount: number;
  currency: string;
  circleMode?: "recurring" | "one_time" | null;
  contributionAmount?: number | null;
}

export function WelcomeBanner({
  groupId,
  groupName,
  groupType,
  creatorName,
  expenseCount,
  memberCount,
  currency,
  circleMode,
  contributionAmount,
}: Props) {
  // Default hidden until localStorage check runs — avoids SSR/client mismatch flash.
  const [dismissed, setDismissed] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const already = localStorage.getItem(ONBOARDING_KEYS.POST_JOIN_SEEN(groupId)) === "1";
    if (!already) setDismissed(false);
  }, [groupId]);

  useEffect(() => {
    if (dismissed) return;
    // Auto-dismiss after 10 seconds — must also write the key (same as manual dismiss)
    // so the banner does not re-appear on the next navigation.
    timerRef.current = setTimeout(() => dismiss(), 10_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed, groupId]);

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.setItem(ONBOARDING_KEYS.POST_JOIN_SEEN(groupId), "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  // ── Copy + CTA by context ──────────────────────────────────────────────
  const isCircle = groupType === "circle";
  const isNest   = groupType === "nest";

  let body = "";
  let ctaLabel = "";
  let ctaHref  = `/groups/${groupId}`;
  const Icon = isCircle ? Coins : isNest ? Home : MapPin;

  if (isCircle) {
    const isRecurring = circleMode === "recurring";
    const isFixed     = !isRecurring && contributionAmount !== null;
    const isFlexi     = !isRecurring && contributionAmount === null;

    if (isRecurring) {
      body     = "Tap 'I’ve paid' when you make your monthly contribution.";
      ctaLabel = "Go to dashboard →";
    } else if (isFixed) {
      body     = `Your contribution: ${formatCurrency(contributionAmount ?? 0, currency)}. Tap ‘I’ve paid’ when ready.`;
      ctaLabel = "Go to dashboard →";
    } else if (isFlexi) {
      body     = "Contribute any amount when you’re ready. The admin tracks the wallet.";
      ctaLabel = "Go to dashboard →";
    } else {
      body     = "Tap ‘I’ve paid’ when you make your contribution.";
      ctaLabel = "Go to dashboard →";
    }
  } else if (isNest) {
    body     = "Everyone logs their share each month — the app handles the rest.";
    ctaLabel = "See this month →";
    ctaHref  = `/groups/${groupId}/expenses`;
  } else {
    // Trip
    if (expenseCount > 0) {
      body     = `${creatorName} has been tracking — here’s the running tally.`;
      ctaLabel = "See who owes what →";
      ctaHref  = `/groups/${groupId}/settle`;
    } else {
      body     = "You’re in early — log the first expense whenever you’re ready.";
      ctaLabel = "Log first expense →";
      ctaHref  = `/groups/${groupId}/expenses/new`;
    }
  }

  // Badge accent color by type
  const badgeBg   = isCircle ? "bg-violet-50 dark:bg-violet-900/30" : isNest ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-cyan-50 dark:bg-cyan-900/30";
  const iconColor = isCircle ? "text-violet-500 dark:text-violet-400" : isNest ? "text-emerald-600 dark:text-emerald-400" : "text-cyan-600 dark:text-cyan-400";
  const ctaColor  = isCircle ? "text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300" : isNest ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300" : "text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300";

  return (
    <div className="glass rounded-2xl p-4 mb-6 relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome banner"
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                   text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                   hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className={`w-9 h-9 rounded-xl ${badgeBg} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-0.5">
            Welcome to {groupName} 👋
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{body}</p>
          <Link
            href={ctaHref}
            onClick={dismiss}
            className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${ctaColor}`}
          >
            {ctaLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
