import { AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";

const COPY = {
  groups: {
    near_limit: "You're using 4 of 5 free groups.",
    at_limit: "You've reached the 5-group free plan limit.",
  },
  members: {
    near_limit: "This group is using 7 of 8 free member slots.",
    at_limit: "This group has reached the 8-member free plan limit.",
  },
  expenses: {
    near_limit: "This group has used 40 of 50 free expenses.",
    at_limit: "This group has reached the 50-expense free plan limit.",
  },
} as const;

interface Props {
  nudge: "near_limit" | "at_limit";
  resource: keyof typeof COPY;
}

export function PlanNudgeBanner({ nudge, resource }: Props) {
  const isAtLimit = nudge === "at_limit";
  const message = COPY[resource][nudge];

  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm mb-5 ${
      isAtLimit
        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40"
        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40"
    }`}>
      {isAtLimit
        ? <XCircle className="w-4 h-4 shrink-0" />
        : <AlertTriangle className="w-4 h-4 shrink-0" />}
      <span>
        {message}{" "}
        <Link href="/upgrade" className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity">
          Upgrade to Clear Plus
        </Link>
        {" "}for unlimited.
      </span>
    </div>
  );
}
