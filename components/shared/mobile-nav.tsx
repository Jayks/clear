"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, BarChart2, ArrowLeftRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "@/lib/nav/active";

// Each tab lights up in its own identity colour (not a shared cyan): Home = cyan
// (brand), Streams = blue (the Stream context colour), Insights = amber (Insights
// is amber app-wide). Class strings are literals so Tailwind keeps them.
// `exact: true` on Home → it lights only on the groups list, not inside a
// specific group (which has its own GroupMobileNav). Streams/Insights keep the
// descendant match so their detail pages stay highlighted.
const NAV_ITEMS = [
  { href: "/groups",   label: "Home",     icon: LayoutGrid,     tourId: "nav-trips", exact: true,
    activeText: "text-cyan-600 dark:text-cyan-400",     pill: "bg-cyan-100 dark:bg-cyan-950/70"   },
  { href: "/stream",   label: "Streams",  icon: ArrowLeftRight, tourId: "nav-streams",
    activeText: "text-blue-600 dark:text-blue-400", pill: "bg-blue-100 dark:bg-blue-950/70" },
  { href: "/insights", label: "Insights", icon: BarChart2,      tourId: "nav-insights",
    activeText: "text-amber-600 dark:text-amber-400",   pill: "bg-amber-100 dark:bg-amber-950/70"  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [streamBadge, setStreamBadge] = useState<string | null>(null);

  // Read badge from localStorage after hydration
  useEffect(() => {
    const read = () => setStreamBadge(localStorage.getItem("clear_stream_has_badge"));
    read();
    window.addEventListener("stream-badge-update", read);
    return () => window.removeEventListener("stream-badge-update", read);
  }, []);

  // Clear badge when on stream pages
  useEffect(() => {
    if (pathname === "/stream" || pathname.startsWith("/stream/")) {
      localStorage.removeItem("clear_stream_has_badge");
      localStorage.setItem("clear_stream_last_viewed", String(Date.now()));
      setStreamBadge(null);
    }
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-md
                    bg-gradient-to-t from-white/85 to-white/40
                    dark:from-slate-950/85 dark:to-slate-950/40">
      <div className="flex items-center justify-around px-4 h-nav-safe">
        {NAV_ITEMS.map(({ href, label, icon: Icon, tourId, activeText, pill, exact }) => {
          const active    = isNavItemActive(pathname, href, exact);
          const isStreams = href === "/stream";
          const badge     = isStreams ? streamBadge : null;

          return (
            <Link
              key={href}
              href={href}
              data-tour={tourId}
              className={cn(
                "relative flex flex-col items-center gap-1 px-8 py-2 rounded-xl min-h-[44px] justify-center transition-colors",
                active ? activeText : "text-slate-500 dark:text-slate-400",
              )}
            >
              {/* Sliding pill — Framer Motion animates this between tabs via layoutId.
                  The pill is rendered only inside the active link, so it carries that
                  tab's accent colour for the whole slide (no mid-animation flash). */}
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className={cn("absolute inset-x-1 top-1 bottom-1 rounded-xl", pill)}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative z-10">
                <Icon className="w-5 h-5" />
                {badge && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-950",
                      badge === "disputed"
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                    )}
                  />
                )}
              </div>
              <span className="relative z-10 text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
