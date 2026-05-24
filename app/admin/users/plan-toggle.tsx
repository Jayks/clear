"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminSetUserPlan } from "@/app/actions/admin";

export function PlanToggle({ userId, currentPlan }: { userId: string; currentPlan: "free" | "plus" }) {
  const [plan, setPlan] = useState(currentPlan);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = plan === "plus" ? "free" : "plus";
    setLoading(true);
    const result = await adminSetUserPlan(userId, next);
    setLoading(false);
    if (result.ok) {
      setPlan(next);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={plan === "plus" ? "Click to downgrade to Free" : "Click to upgrade to Plus"}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all disabled:opacity-50 ${
        plan === "plus"
          ? "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50 hover:bg-cyan-200 dark:hover:bg-cyan-800/50"
          : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600"
      }`}
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {plan === "plus" ? "Plus" : "Free"}
    </button>
  );
}
