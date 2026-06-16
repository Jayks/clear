import Link from "next/link";
import { MapPin, Building2, Coins } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * EmptyTypeNudge — the dashed "you don't have one of these yet" card shown inside
 * a group-type section when the user has other groups but none of this type.
 * One component drives all three types so trip / nest / circle behave identically
 * (the old inline cards were asymmetric and circle had none).
 */

type NudgeType = "trip" | "nest" | "circle";

interface NudgeMeta {
  icon: LucideIcon;
  headline: string;
  sub: string;
  cta: string;
  // literal Tailwind classes so the JIT keeps them
  border: string;
  iconBox: string;
  iconColor: string;
  ctaColor: string;
}

const NUDGE: Record<NudgeType, NudgeMeta> = {
  trip: {
    icon: MapPin,
    headline: "Heading somewhere?",
    sub: "Split flights, stays, and meals — then settle up in a tap when you're back.",
    cta: "New trip →",
    border:
      "border-cyan-200 dark:border-cyan-800/50 hover:border-cyan-400 dark:hover:border-cyan-600 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10",
    iconBox: "bg-cyan-50 dark:bg-cyan-900/20 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/40",
    iconColor: "text-cyan-500 dark:text-cyan-400",
    ctaColor:
      "text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300",
  },
  nest: {
    icon: Building2,
    headline: "Sharing a place?",
    sub: "Rent, bills, and groceries with your mates — squared up every month.",
    cta: "New nest →",
    border:
      "border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10",
    iconBox:
      "bg-emerald-50 dark:bg-emerald-900/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    ctaColor:
      "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
  },
  circle: {
    icon: Coins,
    headline: "Pooling money together?",
    sub: "Collect contributions toward a shared fund or goal — one wallet, everyone in.",
    cta: "New circle →",
    border:
      "border-violet-200 dark:border-violet-800/50 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10",
    iconBox:
      "bg-violet-50 dark:bg-violet-900/20 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40",
    iconColor: "text-violet-500 dark:text-violet-400",
    ctaColor:
      "text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300",
  },
};

export function EmptyTypeNudge({ type }: { type: NudgeType }) {
  const n = NUDGE[type];
  const Icon = n.icon;
  return (
    <Link
      href={`/groups/new?type=${type}`}
      className={`flex items-center gap-3 px-4 py-4 rounded-xl border border-dashed transition-colors group ${n.border}`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${n.iconBox}`}
      >
        <Icon className={`w-4 h-4 ${n.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{n.headline}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{n.sub}</p>
      </div>
      <span
        className={`text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${n.ctaColor}`}
      >
        {n.cta}
      </span>
    </Link>
  );
}
