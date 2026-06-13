import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserSubscription } from "@/lib/subscription/gates";
import { getEarlyBirdSlotsClaimed, isEarlyBirdActive, EARLY_BIRD_SLOTS_TOTAL, EARLY_BIRD_PRICE, REGULAR_PRICE, EARLY_BIRD_ANNUAL_MONTHLY_EQUIV, REGULAR_ANNUAL_MONTHLY_EQUIV, EARLY_BIRD_ANNUAL_SAVINGS, REGULAR_ANNUAL_SAVINGS } from "@/lib/subscription/early-bird";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { PricingCards } from "./pricing-cards";

export const metadata: Metadata = { title: "Upgrade to Plus — Clear" };

export default async function UpgradePage() {
  const [user, claimed] = await Promise.all([
    getCurrentUser(),
    getEarlyBirdSlotsClaimed(),
  ]);
  const sub = user ? await getUserSubscription(user.id) : null;
  // Only treat as Plus if actively paid — trialing users should see the pricing page
  const isPlus = sub?.plan === "plus" && sub?.status === "active";
  const isTrialing = sub?.status === "trialing";

  const earlyBird = isEarlyBirdActive(claimed);
  const price = earlyBird ? EARLY_BIRD_PRICE : REGULAR_PRICE;
  const annualMonthlyEquiv = earlyBird ? EARLY_BIRD_ANNUAL_MONTHLY_EQUIV : REGULAR_ANNUAL_MONTHLY_EQUIV;
  const annualSavings = earlyBird ? EARLY_BIRD_ANNUAL_SAVINGS : REGULAR_ANNUAL_SAVINGS;
  const slotsRemaining = EARLY_BIRD_SLOTS_TOTAL - claimed;

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col flex-1">

      {/* Back link — anchored to top */}
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-4 transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>

      {/* Main content — vertically centered in remaining space */}
      <div className="flex flex-col flex-1 justify-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-violet-500/25 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl text-slate-800 dark:text-slate-100 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
            Clear Plus
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {isPlus
              ? "You're on Plus — enjoy all features."
              : isTrialing
              ? "You're on a free trial. Upgrade to keep access after your trial ends."
              : "Unlock the full experience for your group."}
          </p>
        </div>

        <PricingCards
          isPlus={isPlus}
          isTrialing={isTrialing}
          earlyBird={earlyBird}
          price={price}
          annualMonthlyEquiv={annualMonthlyEquiv}
          annualSavings={annualSavings}
          slotsRemaining={slotsRemaining}
          slotsTotal={EARLY_BIRD_SLOTS_TOTAL}
          claimed={claimed}
        />

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 pb-4">
          Questions? Reach us at{" "}
          <a href="mailto:support@useclear.in" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            support@useclear.in
          </a>
        </p>
      </div>
    </div>
  );
}
