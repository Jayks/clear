import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserSubscription } from "@/lib/subscription/gates";
import { Zap } from "lucide-react";
import Link from "next/link";

export async function TrialBanner() {
  const user = await getCurrentUser();
  if (!user) return null;

  const sub = await getUserSubscription(user.id);
  if (!sub || sub.status !== "trialing" || !sub.trialEndsAt) return null;

  const daysLeft = Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 0) return null;

  const urgent = daysLeft <= 7;

  return (
    <div className={`w-full px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium ${
      urgent
        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-b border-amber-200 dark:border-amber-800/40"
        : "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-b border-cyan-200 dark:border-cyan-800/40"
    }`}>
      <Zap className="w-3.5 h-3.5 shrink-0" />
      <span>
        Clear Plus trial —{" "}
        <span className="font-semibold">{daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>
        {" · "}
        <Link href="/upgrade" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
          Upgrade to keep access
        </Link>
      </span>
    </div>
  );
}
