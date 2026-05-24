import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserSubscription } from "@/lib/subscription/gates";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Checkout — Clear Plus" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/upgrade/checkout");

  const sub = await getUserSubscription(user.id);
  // Only redirect away if actively paid — trialing users can still upgrade
  if (sub?.plan === "plus" && sub?.status === "active") redirect("/upgrade");

  const { cycle } = await searchParams;
  const initialCycle: "monthly" | "annual" = cycle === "annual" ? "annual" : "monthly";

  return (
    <div className="max-w-md mx-auto">
      <Link
        href="/upgrade"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to plans
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
          Confirm your plan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          You can change your billing cycle below before activating.
        </p>
      </div>

      <CheckoutForm initialCycle={initialCycle} />
    </div>
  );
}
