import Link from "next/link";
import { MapPin, Home, Coins, ArrowLeftRight, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SampleLoader } from "@/components/shared/sample-loader";

// First-run "what are you tracking?" chooser — all four of Clear's contexts as
// peers. Trip/Nest/Circle route to the matching create flow; Stream is groupless
// so it links straight to the Streams dashboard.
const CHOOSER: {
  key: string;
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  gradient: string;
  hoverArrow: string;
}[] = [
  {
    key: "trip",
    href: "/groups/new?type=trip",
    title: "Trip",
    desc: "Travel, weekends, events — split as you go, settle up after.",
    icon: MapPin,
    gradient: "from-cyan-500 to-teal-500",
    hoverArrow: "group-hover:text-cyan-500",
  },
  {
    key: "nest",
    href: "/groups/new?type=nest",
    title: "Nest",
    desc: "Household bills with flatmates or family — month to month.",
    icon: Home,
    gradient: "from-emerald-500 to-teal-500",
    hoverArrow: "group-hover:text-emerald-500",
  },
  {
    key: "circle",
    href: "/groups/new?type=circle",
    title: "Circle",
    desc: "A shared pot one person manages — contributions toward a goal or fund.",
    icon: Coins,
    gradient: "from-violet-500 to-purple-600",
    hoverArrow: "group-hover:text-violet-500",
  },
  {
    key: "stream",
    href: "/stream",
    title: "Stream",
    desc: "Track what one person owes you — one-on-one, no group needed.",
    icon: ArrowLeftRight,
    gradient: "from-blue-500 to-indigo-500",
    hoverArrow: "group-hover:text-blue-500",
  },
];

/**
 * The first-run chooser. `showSampleCta` controls the "Explore a sample" loader —
 * shown on a truly empty account, hidden once a sample already exists (the empty
 * Active tab while the Sample tab holds the demos).
 */
export function EmptyChooser({ showSampleCta }: { showSampleCta: boolean }) {
  return (
    <div className="py-12 sm:py-16 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2
          className="text-2xl text-slate-800 dark:text-slate-100 mb-2"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          What are you tracking?
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Pick the kind of group that fits — you can always make more later.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {CHOOSER.map(({ key, href, title, desc, icon: Icon, gradient, hoverArrow }) => (
          <Link
            key={key}
            href={href}
            className="glass rounded-2xl p-4 flex items-center gap-4 group
                       hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient}
                            flex items-center justify-center shrink-0 shadow-sm`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
            </div>
            <ArrowRight className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0
                                   transition-colors ${hoverArrow}`} />
          </Link>
        ))}
      </div>

      {showSampleCta && <SampleLoader />}
    </div>
  );
}
