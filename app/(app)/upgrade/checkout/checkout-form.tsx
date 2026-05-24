"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { activatePlusDemo } from "@/app/actions/subscription";
import { Loader2, Lock } from "lucide-react";

const PRICES = { monthly: 49, annual: 499 } as const;

export function CheckoutForm({ initialCycle }: { initialCycle: "monthly" | "annual" }) {
  const [cycle, setCycle] = useState<"monthly" | "annual">(initialCycle);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const price = PRICES[cycle];

  async function handleActivate() {
    setLoading(true);
    try {
      const result = await activatePlusDemo(cycle);
      if (result.ok) {
        toast.success("Welcome to Plus! ✦", {
          description: "All features are now unlocked.",
          duration: 5000,
        });
        router.push("/groups");
      } else {
        toast.error(result.error ?? "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Radio plan options */}
      {(["monthly", "annual"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCycle(c)}
          className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
            cycle === c
              ? "border-violet-400 dark:border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
              : "border-slate-200 dark:border-slate-700 glass hover:border-violet-200 dark:hover:border-violet-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                cycle === c ? "border-violet-500 bg-violet-500" : "border-slate-300 dark:border-slate-600"
              }`}>
                {cycle === c && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {c === "monthly" ? "Monthly" : "Annual"}
                  {c === "annual" && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                      Best Value
                    </span>
                  )}
                </p>
                {c === "annual" && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    ₹41/month · saves ₹89/year
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">₹{PRICES[c]}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{c === "monthly" ? "/ month" : "/ year"}</p>
            </div>
          </div>
        </button>
      ))}

      {/* Order summary */}
      <div className="glass rounded-2xl p-5 mt-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          Order summary
        </p>
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              Clear Plus · {cycle === "monthly" ? "Monthly" : "Annual"}
            </span>
            <span className="tabular-nums text-slate-400 dark:text-slate-500 line-through">₹{price}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              Founder discount <span className="text-xs text-slate-400 dark:text-slate-500">(100% off)</span>
            </span>
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">−₹{price}</span>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3.5 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Total due today</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
              ₹0
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleActivate}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-violet-500/20 transition-all text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>✦</span>}
          {loading ? "Activating…" : "Activate Plus free →"}
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-400 dark:text-slate-500">
          <Lock className="w-3 h-3" />
          No credit card needed · Cancel anytime
        </div>
      </div>
    </div>
  );
}
