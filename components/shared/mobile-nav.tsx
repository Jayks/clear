"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/groups",   label: "Groups",   icon: LayoutGrid, tourId: "nav-trips"    },
  { href: "/insights", label: "Insights", icon: BarChart2, tourId: "nav-insights" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-nav border-t border-white/60 dark:border-slate-700/40">
      <div className="flex items-center justify-around px-4 h-nav-safe">
        {NAV_ITEMS.map(({ href, label, icon: Icon, tourId }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              data-tour={tourId}
              className={cn(
                "flex flex-col items-center gap-1 px-8 py-2 rounded-xl min-h-[44px] justify-center transition-all",
                active
                  ? "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
