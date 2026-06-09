"use client";

import { useState } from "react";
import { updateCircleStatus } from "@/app/actions/circle";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import { ShoppingBag, CheckCircle2, Target } from "lucide-react";

interface Props {
  groupId:          string;
  status:           string | null;   // 'active' | 'purchased' | 'complete'
  isAdmin:          boolean;
  poolBalance:      number;
  allTimeExpenses:  number;
  allTimeCollected: number;
  targetAmount:     number | null;
  currency:         string;
}

export function CircleGoalStatus({
  groupId, status, isAdmin, poolBalance, allTimeExpenses, allTimeCollected, targetAmount, currency,
}: Props) {
  const isComplete  = status === "complete";
  const goalReached = targetAmount === null || allTimeCollected >= targetAmount;
  const stillNeeded = targetAmount !== null ? Math.max(0, targetAmount - allTimeCollected) : 0;
  const hasSurplus  = poolBalance > 0;

  const [busy,     setBusy]     = useState(false);
  const [wrapping, setWrapping] = useState(false);

  async function handleWrapUp() {
    setBusy(true);
    hapticLight();
    const result = await updateCircleStatus(groupId, "complete");
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed to wrap up");
    } else {
      hapticSuccess();
      setWrapping(false);
      toast.success("Goal wrapped up 🎉");
    }
  }

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      {/* Section header — amber accent for one-time mode */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Goal status</span>
        <div className="animate-rule-enter flex-1 h-[1.5px] bg-gradient-to-r from-amber-200/70 to-transparent dark:from-amber-800/40 dark:to-transparent" />
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        {isComplete ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                           bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                           bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Target className="w-3.5 h-3.5" />
            Collecting
          </span>
        )}
      </div>

      {/* Complete state */}
      {isComplete && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">
          🎉 This goal is complete
        </p>
      )}

      {/* Admin: goal reached, not yet complete → wrap-up */}
      {isAdmin && !isComplete && goalReached && (
        <>
          {/* Surplus info */}
          {hasSurplus && (
            <div className="mb-3 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20
                            border border-amber-200/60 dark:border-amber-700/40">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                💰 {formatCurrency(poolBalance, currency)} surplus in wallet
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                Collected {formatCurrency(allTimeCollected, currency)} · Spent {formatCurrency(allTimeExpenses, currency)}
              </p>
            </div>
          )}

          {!wrapping ? (
            <button
              type="button"
              onClick={() => setWrapping(true)}
              className="w-full py-2.5 text-sm font-medium rounded-xl transition-all
                         bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
                         text-white shadow-sm shadow-amber-500/20"
            >
              Wrap up →
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                {hasSurplus
                  ? `The ₹${poolBalance.toLocaleString("en-IN")} surplus will stay in the wallet.`
                  : "This will mark the goal as complete."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWrapping(false)}
                  className="flex-1 py-2 text-xs font-medium rounded-xl border
                             border-slate-200 dark:border-slate-700
                             text-slate-600 dark:text-slate-300
                             hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWrapUp}
                  disabled={busy}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all disabled:opacity-50
                             bg-gradient-to-br from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600
                             text-white shadow-sm shadow-emerald-500/20"
                >
                  {busy ? "Wrapping up…" : "Confirm ✓"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin: goal not yet reached */}
      {isAdmin && !isComplete && !goalReached && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700
                        bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-center space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Goal not yet reached
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {formatCurrency(stillNeeded, currency)} still needed
          </p>
        </div>
      )}

      {/* Member: not yet complete, show collecting hint */}
      {!isAdmin && !isComplete && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          {goalReached ? "Goal reached — admin will wrap up soon" : `${formatCurrency(stillNeeded, currency)} still needed`}
        </p>
      )}
    </div>
  );
}
