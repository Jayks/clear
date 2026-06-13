import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserSubscription } from "@/lib/subscription/gates";
import { getEarlyBirdSlotsClaimed, isEarlyBirdActive, EARLY_BIRD_PRICE, REGULAR_PRICE, EARLY_BIRD_ANNUAL_MONTHLY_EQUIV, REGULAR_ANNUAL_MONTHLY_EQUIV, EARLY_BIRD_ANNUAL_SAVINGS, REGULAR_ANNUAL_SAVINGS, EARLY_BIRD_SLOTS_TOTAL } from "@/lib/subscription/early-bird";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Checkout — Clear Plus" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const [user, claimed] = await Promise.all([getCurrentUser(), getEarlyBirdSlotsClaimed()]);
  if (!user) redirect("/login?returnTo=/upgrade/checkout");

  const sub = await getUserSubscription(user.id);
  // Only redirect away if actively paid — trialing users can still upgrade
  if (sub?.plan === "plus" && sub?.status === "active") redirect("/upgrade");

  const { cycle } = await searchParams;
  const initialCycle: "monthly" | "annual" = cycle === "annual" ? "annual" : "monthly";

  const earlyBird = isEarlyBirdActive(claimed);
  const price = earlyBird ? EARLY_BIRD_PRICE : REGULAR_PRICE;
  const annualMonthlyEquiv = earlyBird ? EARLY_BIRD_ANNUAL_MONTHLY_EQUIV : REGULAR_ANNUAL_MONTHLY_EQUIV;
  const annualSavings = earlyBird ? EARLY_BIRD_ANNUAL_SAVINGS : REGULAR_ANNUAL_SAVINGS;
  const slotsRemaining = EARLY_BIRD_SLOTS_TOTAL - claimed;

  return (
    <div className="max-w-md mx-auto w-full flex flex-col flex-1">

      {/* Back link — anchored to top */}
      <Link
        href="/upgrade"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-4 transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to plans
      </Link>

      {/* Main content — vertically centered in remaining space */}
      <div className="flex flex-col flex-1 justify-center">
        <div className="mb-6">
          <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
            Confirm your plan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            You can change your billing cycle below before activating.
          </p>
        </div>

        <CheckoutForm
          initialCycle={initialCycle}
          earlyBird={earlyBird}
          price={price}
          annualMonthlyEquiv={annualMonthlyEquiv}
          annualSavings={annualSavings}
          slotsRemaining={slotsRemaining}
          slotsTotal={EARLY_BIRD_SLOTS_TOTAL}
        />
      </div>
    </div>
  );
}
