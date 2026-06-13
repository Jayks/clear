import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import {
  EARLY_BIRD_SLOTS_TOTAL,
  EARLY_BIRD_PRICE,
  REGULAR_PRICE,
  EARLY_BIRD_ANNUAL_MONTHLY_EQUIV,
  REGULAR_ANNUAL_MONTHLY_EQUIV,
  EARLY_BIRD_ANNUAL_SAVINGS,
  REGULAR_ANNUAL_SAVINGS,
  getEarlyBirdSlotsClaimed,
  isEarlyBirdActive,
} from "@/lib/subscription/early-bird";

const FEATURES: { label: string; free: string | boolean; plus: string | boolean }[] = [
  { label: "Active groups",       free: "Up to 5",    plus: "Unlimited"  },
  { label: "Members per group",   free: "Unlimited",  plus: "Unlimited"  },
  { label: "Expenses per group",  free: "Unlimited",  plus: "Unlimited"  },
  { label: "All split modes",     free: true,          plus: true         },
  { label: "Recurring templates", free: false,         plus: true         },
  { label: "AI receipt scan",     free: true,          plus: true         },
  { label: "Receipt photo vault",  free: "60 days",    plus: "Permanent"  },
  { label: "CSV export",          free: false,         plus: true         },
];

export async function PlanCards() {
  const claimed = await getEarlyBirdSlotsClaimed();
  const earlyBird = isEarlyBirdActive(claimed);

  const price = earlyBird ? EARLY_BIRD_PRICE : REGULAR_PRICE;
  const annualMonthlyEquiv = earlyBird ? EARLY_BIRD_ANNUAL_MONTHLY_EQUIV : REGULAR_ANNUAL_MONTHLY_EQUIV;
  const annualSavings = earlyBird ? EARLY_BIRD_ANNUAL_SAVINGS : REGULAR_ANNUAL_SAVINGS;
  const slotsRemaining = EARLY_BIRD_SLOTS_TOTAL - claimed;
  const progressPct = Math.min((claimed / EARLY_BIRD_SLOTS_TOTAL) * 100, 100);
  // Early Bird's hook = the discount vs the regular price (locked forever).
  const annualOffRegular = REGULAR_PRICE.annual - price.annual; // ₹200 while early-bird is active

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

      {/* ── Free ───────────────────────────────────────────────────────────── */}
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
        <Link
          href="/login?intent=signup"
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all text-sm"
        >
          Get started free <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Plus ───────────────────────────────────────────────────────────── */}
      <div className={`relative rounded-2xl flex flex-col bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-violet-200/60 dark:border-violet-800/40 shadow-lg shadow-violet-500/10 ${earlyBird ? "overflow-hidden" : ""}`}>

        {/* Early Bird banner — shown while slots are available */}
        {earlyBird ? (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 pt-3 pb-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                🐦 Early Bird Pricing
              </p>
              <p className="text-[11px] font-semibold text-amber-100 tabular-nums">
                {slotsRemaining} of {EARLY_BIRD_SLOTS_TOTAL} slots left
              </p>
            </div>
            {/* Slot fill progress */}
            <div className="h-1 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/70 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          /* Thin gradient bar when no early-bird pricing */
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-2xl" />
        )}

        <div className={`p-6 flex flex-col flex-1 ${!earlyBird ? "pt-8" : ""}`}>
          {/* Plan label */}
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Plus</p>
            <span className="text-[10px] text-violet-500 dark:text-violet-400">✦</span>
          </div>

          {/* Pricing block */}
          <div className="mb-5">
            {earlyBird ? (
              <>
                {/* Early Bird: strikethrough regular, bold early-bird price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-slate-400 dark:text-slate-500 line-through tabular-nums">
                    ₹{REGULAR_PRICE.monthly}
                  </span>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                    ₹{price.monthly}
                    <span className="text-base font-normal text-slate-400 dark:text-slate-500">/mo</span>
                  </p>
                </div>
                {/* Annual option */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    or ₹{price.annual}/year · ₹{annualMonthlyEquiv}/mo
                  </span>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                    ₹{annualOffRegular}/yr off regular
                  </span>
                </div>
                {/* Early-bird lock-in assurance */}
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-2 flex items-center gap-1">
                  🔒 Price locked in forever — never increases for you
                </p>
              </>
            ) : (
              <>
                {/* Regular pricing */}
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums" style={{ fontFamily: "var(--font-fraunces)" }}>
                  ₹{price.monthly}
                  <span className="text-base font-normal text-slate-400 dark:text-slate-500">/mo</span>
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    or ₹{price.annual}/year · ₹{annualMonthlyEquiv}/mo
                  </span>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                    saves ₹{annualSavings}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Feature list */}
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

          {/* CTA */}
          <Link
            href="/login?intent=signup"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl shadow-md shadow-violet-500/20 transition-all text-sm"
          >
            <span>✦</span>
            Start 30-day trial
          </Link>
          <p className="text-xs text-center text-violet-400/70 dark:text-violet-500/70 mt-2">
            No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}
