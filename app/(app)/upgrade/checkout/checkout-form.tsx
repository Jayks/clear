"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { activatePlusDemo } from "@/app/actions/subscription";
import { Loader2, Lock } from "lucide-react";

interface CheckoutFormProps {
  initialCycle: "monthly" | "annual";
  founder: boolean;
  price: { monthly: number; annual: number };
  annualMonthlyEquiv: number;
  annualSavings: number;
  slotsRemaining: number;
  slotsTotal: number;
}

export function CheckoutForm({
  initialCycle,
  founder,
  price,
  annualMonthlyEquiv,
  annualSavings,
  slotsRemaining,
  slotsTotal,
}: CheckoutFormProps) {
  const [cycle, setCycle] = useState<"monthly" | "annual">(initialCycle);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const regularMonthly = 99; // used for strikethrough when founder is active
  const selectedPrice = price[cycle];
  const annualSavingsPct = Math.round((annualSavings / (regularMonthly * 12)) * 100);

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

      {/* ── Founder notice ──────────────────────────────────────────────── */}
      {founder && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-700/40 px-4 py-3 flex items-start gap-2.5">
          <span className="text-amber-500 text-sm mt-0.5 shrink-0">🔒</span>
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Founder pricing — {slotsRemaining} of {slotsTotal} slots remaining
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              This rate is locked in forever and will never increase for you.
            </p>
          </div>
        </div>
      )}

      {/* ── Billing cycle radio options ─────────────────────────────────── */}
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Radio dot */}
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                cycle === c ? "border-violet-500 bg-violet-500" : "border-slate-300 dark:border-slate-600"
              }`}>
                {cycle === c && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>

              {/* Label + sub-info */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  {c === "monthly" ? "Monthly" : "Annual"}
                  {c === "annual" && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                      Best value — save {annualSavingsPct}%
                    </span>
                  )}
                </p>
                {c === "annual" && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    ₹{annualMonthlyEquiv}/month · saves ₹{annualSavings} vs monthly billing
                  </p>
                )}
                {c === "monthly" && founder && (
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    Founder rate · locked in forever
                  </p>
                )}
              </div>
            </div>

            {/* Price (right-aligned) */}
            <div className="text-right shrink-0">
              {founder ? (
                <>
                  <p className="text-xs text-slate-400 dark:text-slate-500 line-through tabular-nums">
                    ₹{c === "monthly" ? regularMonthly : 799}
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    ₹{price[c]}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  ₹{price[c]}
                </p>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {c === "monthly" ? "/ month" : "/ year"}
              </p>
            </div>
          </div>
        </button>
      ))}

      {/* ── Order summary ───────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 mt-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          Order summary
        </p>

        <div className="space-y-2.5 mb-4">
          {/* Plan line */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              Clear Plus · {cycle === "monthly" ? "Monthly" : "Annual"}
              {founder && <span className="ml-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full align-middle">Founder</span>}
            </span>
            <span className="tabular-nums text-slate-400 dark:text-slate-500 line-through">
              ₹{selectedPrice}
            </span>
          </div>

          {/* Beta launch discount */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              Beta launch{" "}
              <span className="text-xs text-slate-400 dark:text-slate-500">(100% off)</span>
            </span>
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
              −₹{selectedPrice}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3.5 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Total due today</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
              ₹0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
            Billing starts at{" "}
            <span className="font-medium text-slate-500 dark:text-slate-400">
              ₹{selectedPrice}/{cycle === "monthly" ? "month" : "year"}
            </span>
            {" "}when payment goes live — we&apos;ll notify you before your first charge.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleActivate}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 mt-3 bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-violet-500/20 transition-all text-sm"
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
