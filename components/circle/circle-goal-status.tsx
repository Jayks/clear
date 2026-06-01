"use client";

import { useState } from "react";
import { updateCircleStatus } from "@/app/actions/circle";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import { CheckCircle2, ShoppingBag, Circle } from "lucide-react";

type LifecycleStatus = "active" | "purchased" | "complete";

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

const STEPS: { key: LifecycleStatus; label: string; icon: React.ReactNode }[] = [
  { key: "active",    label: "Collecting",  icon: <Circle       className="w-3.5 h-3.5" /> },
  { key: "purchased", label: "Purchased",   icon: <ShoppingBag  className="w-3.5 h-3.5" /> },
  { key: "complete",  label: "Complete",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

const STEP_INDEX: Record<LifecycleStatus, number> = { active: 0, purchased: 1, complete: 2 };

function normalise(s: string | null): LifecycleStatus {
  if (s === "purchased" || s === "complete") return s;
  return "active";
}

export function CircleGoalStatus({
  groupId, status, isAdmin, poolBalance, allTimeExpenses, allTimeCollected, targetAmount, currency,
}: Props) {
  const current = normalise(status);
  const currentIdx = STEP_INDEX[current];
  const [optimisticStatus, setOptimisticStatus] = useState<LifecycleStatus>(current);
  const [busy, setBusy] = useState(false);
  const [surplusDismissed, setSurplusDismissed] = useState(false);

  // Gate — cannot purchase/complete until all contributions are in
  const goalReached = targetAmount === null || allTimeCollected >= targetAmount;
  const stillNeeded = targetAmount !== null ? Math.max(0, targetAmount - allTimeCollected) : 0;

  const displayStatus = optimisticStatus;
  const displayIdx    = STEP_INDEX[displayStatus];

  async function transition(newStatus: "purchased" | "complete") {
    setBusy(true);
    hapticLight();
    const prev = optimisticStatus;
    setOptimisticStatus(newStatus); // optimistic
    const result = await updateCircleStatus(groupId, newStatus);
    setBusy(false);
    if (!result.ok) {
      setOptimisticStatus(prev);
      toast.error(result.error ?? "Failed to update status");
    } else {
      hapticSuccess();
      toast.success(newStatus === "purchased" ? "Marked as purchased 🛍️" : "Goal marked complete 🎉");
    }
  }

  const showSurplus =
    !surplusDismissed &&
    displayStatus === "purchased" &&
    poolBalance > 0 &&
    isAdmin;

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Goal status</span>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-200/70 to-transparent dark:from-rose-800/40 dark:to-transparent" />
      </div>

      {/* Lifecycle stepper */}
      <div className="flex items-center gap-0 mb-4">
        {STEPS.map((step, i) => {
          const isDone    = displayIdx > i;
          const isActive  = displayIdx === i;
          const isLast    = i === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isActive
                    ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-500/30"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                }`}>
                  {isDone ? "✓" : step.icon}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  isDone
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isActive
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}>
                  {step.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1.5 mb-4 transition-colors ${
                  displayIdx > i
                    ? "bg-emerald-400 dark:bg-emerald-600"
                    : "bg-slate-200 dark:bg-slate-700"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Admin transition button — gated on goal being fully funded */}
      {isAdmin && displayStatus === "active" && (
        goalReached ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => transition("purchased")}
            className="w-full py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50
                       bg-gradient-to-br from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600
                       text-white shadow-sm shadow-rose-500/20"
          >
            {busy ? "Updating…" : "Mark as purchased 🛍️"}
          </button>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700
                          bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Goal not yet reached
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatCurrency(stillNeeded, currency)} still needed before purchasing
            </p>
          </div>
        )
      )}

      {isAdmin && displayStatus === "purchased" && !showSurplus && (
        <button
          type="button"
          disabled={busy}
          onClick={() => transition("complete")}
          className="w-full py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50
                     bg-gradient-to-br from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600
                     text-white shadow-sm shadow-emerald-500/20"
        >
          {busy ? "Updating…" : "Mark as complete ✓"}
        </button>
      )}

      {displayStatus === "complete" && (
        <p className="text-xs text-center text-emerald-600 dark:text-emerald-400 font-medium">
          🎉 This goal is complete
        </p>
      )}

      {/* Surplus acknowledgment card — admin, purchased status, pool > 0 */}
      {showSurplus && (
        <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-700/50
                         bg-amber-50/80 dark:bg-amber-900/20 p-3.5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              💰 {formatCurrency(poolBalance, currency)} surplus remaining
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              Collected {formatCurrency(allTimeCollected, currency)} · Spent {formatCurrency(allTimeExpenses, currency)}
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            What should happen to the surplus?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                hapticLight();
                setSurplusDismissed(true);
                toast.success("Noted — surplus stays in the wallet");
              }}
              className="flex-1 py-2 text-xs font-medium rounded-lg border transition-colors
                         border-slate-200 dark:border-slate-700
                         text-slate-600 dark:text-slate-300
                         hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50"
            >
              Keep in wallet
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => transition("complete")}
              className="flex-1 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50
                         bg-gradient-to-br from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600
                         text-white shadow-sm shadow-emerald-500/20"
            >
              {busy ? "…" : "Note as distributed ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
