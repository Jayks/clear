"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { REGULAR_PRICE } from "@/lib/subscription/prices";

const FEATURES: { label: string; free: string | boolean; plus: string | boolean }[] = [
  { label: "Active groups",       free: "Up to 5",   plus: "Unlimited" },
  { label: "Members per group",   free: "Unlimited", plus: "Unlimited" },
  { label: "Expenses per group",  free: "Unlimited", plus: "Unlimited" },
  { label: "All split modes",     free: true,        plus: true },
  { label: "Recurring templates", free: false,       plus: true },
  { label: "AI receipt scan",     free: true,        plus: true },
  { label: "Receipt photo vault", free: "60 days",   plus: "Permanent" },
  { label: "CSV export",          free: false,       plus: true },
];

interface PricingCardsProps {
  isPlus: boolean;
  isTrialing: boolean;
  earlyBird: boolean;
  price: { monthly: number; annual: number };
  annualMonthlyEquiv: number;
  annualSavings: number;
  slotsRemaining: number;
  slotsTotal: number;
  claimed: number;
}

export function PricingCards({
  isPlus,
  isTrialing,
  earlyBird,
  price,
  annualMonthlyEquiv,
  annualSavings,
  slotsRemaining,
  slotsTotal,
  claimed,
}: PricingCardsProps) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  const regularMonthly = REGULAR_PRICE.monthly; // shown as strikethrough when early-bird is active
  const regularAnnual  = REGULAR_PRICE.annual;  // shown as strikethrough when early-bird is active

  // Early Bird's hook is the discount vs the regular price (locked forever),
  // not the annual-vs-monthly cadence delta (tiny when monthly is already cheap).
  const annualOffRegular = REGULAR_PRICE.annual - price.annual;     // ₹200 for Early Bird, 0 for regular
  const monthlyOffRegular = REGULAR_PRICE.monthly - price.monthly;  // ₹30 for Early Bird, 0 for regular
  const annualSavingsPct = earlyBird
    ? Math.round((annualOffRegular / REGULAR_PRICE.annual) * 100)   // % off regular annual
    : Math.round((annualSavings / (price.monthly * 12)) * 100);     // % annual vs monthly

  if (isPlus) {
    return (
      <div className="glass rounded-2xl p-8 text-center max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
          <span className="text-white text-lg">✦</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          You&apos;re on Plus
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          All features are unlocked. Enjoy Clear Plus!
        </p>
      </div>
    );
  }

  const progressPct = Math.min((claimed / slotsTotal) * 100, 100);

  return (
    <div className="space-y-6">

      {/* ── Early Bird notice (full-width, above cards) ──────────────────── */}
      {earlyBird && (
        <div className="rounded-2xl overflow-hidden border border-amber-200/60 dark:border-amber-700/40 shadow-sm shadow-amber-500/10">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 pt-3.5 pb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                🐦 Early Bird Pricing — locked in forever
              </p>
              <p className="text-xs font-semibold text-amber-100 tabular-nums">
                {slotsRemaining} of {slotsTotal} slots left
              </p>
            </div>
            <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
              <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="bg-amber-50/60 dark:bg-amber-950/20 px-5 py-3 flex items-start gap-2.5">
            <span className="text-amber-500 text-sm mt-0.5">🔒</span>
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              Sign up now and your price is <strong>locked in forever</strong> — it will never increase,
              even after early-bird slots fill up and regular pricing takes effect.
            </p>
          </div>
        </div>
      )}

      {/* ── Billing cycle toggle ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 p-1 glass rounded-xl">
          {(["monthly", "annual"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                cycle === c
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {c === "monthly" ? "Monthly" : (
                <>
                  Annual{" "}
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                    Save {annualSavingsPct}%
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plan cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

        {/* Free */}
        <div className="glass rounded-2xl p-6 flex flex-col">
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Free</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>₹0</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Forever free</p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-6">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                {f.free ? (
                  <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                )}
                <span className={f.free ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}>
                  {typeof f.free === "string" ? (
                    <><span className="font-medium">{f.free}</span> {f.label.toLowerCase()}</>
                  ) : f.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="text-xs text-center text-slate-400 dark:text-slate-500 font-medium py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {isTrialing ? "Your current plan" : "Current plan"}
          </div>
        </div>

        {/* Plus */}
        <div className="relative rounded-2xl p-6 flex flex-col bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-violet-200/60 dark:border-violet-800/40 shadow-lg shadow-violet-500/10">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-2xl" />

          <div className="mb-5 pt-1">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Plus</p>
              <span className="text-[10px] text-violet-500 dark:text-violet-400">✦</span>
            </div>

            {/* Price — monthly view */}
            {cycle === "monthly" && (
              <>
                {earlyBird ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-slate-400 dark:text-slate-500 line-through tabular-nums">₹{regularMonthly}</span>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                      ₹{price.monthly}
                    </p>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                    ₹{price.monthly}
                  </p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">per month</p>
                {earlyBird && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1.5">
                    Save ₹{monthlyOffRegular}/mo vs regular — locked forever
                  </p>
                )}
              </>
            )}

            {/* Price — annual view */}
            {cycle === "annual" && (
              <>
                {earlyBird ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-slate-400 dark:text-slate-500 line-through tabular-nums">₹{regularAnnual}</span>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                      ₹{price.annual}
                    </p>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                    ₹{price.annual}
                  </p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  per year · ₹{annualMonthlyEquiv}/month
                </p>
                {/* Savings callout */}
                {earlyBird ? (
                  <div className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-3 py-2">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Save ₹{annualOffRegular}/year vs regular price
                    </p>
                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500 mt-0.5">
                      Locked in forever — your rate never increases
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-3 py-2">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Save ₹{annualSavings}/year
                    </p>
                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500 mt-0.5">
                      vs paying ₹{price.monthly}/month · {annualSavingsPct}% off
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <ul className="space-y-2.5 flex-1 mb-6">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-200">
                  {typeof f.plus === "string" ? (
                    <><span className="font-medium">{f.plus}</span> {f.label.toLowerCase()}</>
                  ) : f.label}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href={`/upgrade/checkout?cycle=${cycle}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl shadow-md shadow-violet-500/20 transition-all text-sm"
          >
            <span>✦</span>
            {isTrialing ? "Upgrade to Plus" : "Start 30-day trial"}
          </Link>
          <p className="text-xs text-center text-violet-400/70 dark:text-violet-500/70 mt-2">
            No credit card required
          </p>
        </div>
      </div>

      {/* ── Group coverage note ──────────────────────────────────────────── */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        One Plus subscription covers your <span className="font-medium text-slate-500 dark:text-slate-400">entire group</span> —
        all members get AI splitting, all split modes, and no limits.
      </p>
    </div>
  );
}
