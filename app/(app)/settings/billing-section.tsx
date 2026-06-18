import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Subscription } from "@/lib/db/schema/subscriptions";
import { ArrowRight, RefreshCw } from "lucide-react";

interface BillingSectionProps {
  sub: Subscription | null;
}

// Razorpay M3: passes are one-time purchases that simply expire — no cancel
// action exists in v1 (RAZORPAY_PLAN.md §7/§11). Not a client component
// anymore — there's nothing left to manage state for once the demo
// activate/cancel stubs are gone.
export function BillingSection({ sub }: BillingSectionProps) {
  // Timestamp-driven (Razorpay M1 refactor) — status==='active' is never cleared on
  // lapse under lazy expiry, so checking it directly would show "Plus" forever after
  // a pass expires. currentPeriodEnd is the actual source of truth.
  const isPlus = !!(sub?.currentPeriodEnd && sub.currentPeriodEnd > new Date());
  const passLabel =
    sub?.billingCycle === "annual" ? "Annual pass" : sub?.billingCycle === "pass_30d" ? "30-day pass" : null;

  if (isPlus) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-slate-500 dark:text-slate-400">Your plan</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
            <span>✦</span> Plus
          </span>
        </div>
        {passLabel && (
          <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-sm text-slate-500 dark:text-slate-400">Pass</span>
            <span className="text-sm text-slate-700 dark:text-slate-200">{passLabel}</span>
          </div>
        )}
        {sub?.currentPeriodEnd && (
          <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-sm text-slate-500 dark:text-slate-400">Plus until</span>
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {formatDate(sub.currentPeriodEnd.toISOString())}
            </span>
          </div>
        )}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <Link
            href="/upgrade/checkout"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Renew or extend
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your plan</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">Free</p>
      </div>
      <Link
        href="/upgrade"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
      >
        <span>✦</span> Upgrade to Plus <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
