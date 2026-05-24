"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cancelPlusDemo } from "@/app/actions/subscription";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import type { Subscription } from "@/lib/db/schema/subscriptions";
import { ArrowRight, Loader2 } from "lucide-react";

const CYCLE_LABELS: Record<string, { label: string; price: string }> = {
  monthly: { label: "Monthly", price: "₹49/month" },
  annual:  { label: "Annual",  price: "₹499/year · ₹41/month" },
};

export function BillingSection({ sub }: { sub: Subscription | null }) {
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const isPlus = !cancelled && sub?.plan === "plus" && sub?.status === "active";
  const cycle = sub?.billingCycle as "monthly" | "annual" | null;
  const cycleInfo = cycle ? CYCLE_LABELS[cycle] : null;

  async function handleCancel() {
    setLoading(true);
    try {
      const result = await cancelPlusDemo();
      if (result.ok) {
        setCancelled(true);
        toast.success("Downgraded to Free", {
          description: "You're now on the Free plan. Your data is safe.",
          duration: 5000,
        });
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (isPlus) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-slate-500 dark:text-slate-400">Your plan</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
            <span>✦</span> Plus
          </span>
        </div>
        {cycleInfo && (
          <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-sm text-slate-500 dark:text-slate-400">Billing</span>
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {cycleInfo.label} · {cycleInfo.price}
            </span>
          </div>
        )}
        {sub?.currentPeriodEnd && (
          <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-sm text-slate-500 dark:text-slate-400">Renews</span>
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {formatDate(sub.currentPeriodEnd.toISOString())}
            </span>
          </div>
        )}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Downgrade to Free
              </button>
            }
            title="Downgrade to Free?"
            description="You'll lose access to Plus features immediately: all split modes, AI parsing, recurring templates, and CSV export."
            confirmLabel="Downgrade"
            destructive
            onConfirm={handleCancel}
          />
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
