"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";

const FEATURES: { label: string; free: string | boolean; plus: string | boolean }[] = [
  { label: "Groups",              free: "Up to 4",    plus: "Unlimited" },
  { label: "Members per group",   free: "Up to 8",    plus: "Up to 50" },
  { label: "Expenses per group",  free: "Up to 50",   plus: "Up to 500" },
  { label: "Split modes",         free: "Equal only", plus: "All modes" },
  { label: "Recurring templates", free: false,        plus: true },
  { label: "AI expense parsing",  free: false,        plus: true },
  { label: "CSV export",          free: false,        plus: true },
];

const PRICE = { monthly: 49, annual: 499 } as const;

export function PricingCards({ isPlus }: { isPlus: boolean }) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

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

  return (
    <div className="space-y-6">
      {/* Global billing cycle toggle */}
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
                <>Annual <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">Save 15%</span></>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            Your current plan
          </div>
        </div>

        {/* Plus */}
        <div className="relative rounded-2xl p-6 flex flex-col bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-violet-200/60 dark:border-violet-800/40 shadow-lg shadow-violet-500/10">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-2xl" />
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Plus</p>
              <span className="text-[10px] text-violet-500 dark:text-violet-400">✦</span>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
              ₹{PRICE[cycle]}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {cycle === "monthly" ? "per month" : "per year · ₹41/month"}
            </p>
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
            Upgrade to Plus
          </Link>
        </div>
      </div>
    </div>
  );
}
