import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserSubscription } from "@/lib/subscription/gates";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { PricingCards } from "./pricing-cards";

export const metadata: Metadata = { title: "Upgrade to Plus — Clear" };

export default async function UpgradePage() {
  const user = await getCurrentUser();
  const sub = user ? await getUserSubscription(user.id) : null;
  // Only treat as Plus if actively paid — trialing users should see the pricing page
  const isPlus = sub?.plan === "plus" && sub?.status === "active";
  const isTrialing = sub?.status === "trialing";

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to groups
      </Link>

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

      <PricingCards isPlus={isPlus} />

      <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
        Questions? Reach us at{" "}
        <a href="mailto:support@useclear.in" className="text-cyan-600 dark:text-cyan-400 hover:underline">
          support@useclear.in
        </a>
      </p>
    </div>
  );
}
