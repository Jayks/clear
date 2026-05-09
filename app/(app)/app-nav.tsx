"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { LogOut, Compass, BarChart2, LayoutGrid, LayoutDashboard, Sparkles } from "lucide-react";
import { useTour } from "@/components/tour/tour-context";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const NAV_LINKS = [
  { href: "/groups",   label: "Groups",   icon: LayoutGrid, tourId: "nav-trips"    },
  { href: "/insights", label: "Insights", icon: BarChart2,  tourId: "nav-insights" },
];

export default function AppNav({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { start: startTour } = useTour();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user.user_metadata?.full_name
    ? (user.user_metadata.full_name as string)
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "W";

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/groups" className="flex items-center gap-2 group shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-shadow">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
            Clear
          </span>
        </Link>

        {/* Nav links — hidden on mobile (bottom nav handles it), icon + label on desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon, tourId }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                data-tour={tourId}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <ThemeToggle />


        {/* Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-full" />}
          >
            <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-white shadow-sm">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name ?? "User"} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-teal-500 text-white text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 glass border-white/70 dark:border-slate-700/60 shadow-lg shadow-cyan-500/10">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {user.user_metadata?.full_name ?? "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-700" />
            {isAdmin && (
              <DropdownMenuItem
                onClick={() => router.push("/admin")}
                className="cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={startTour}
              className="cursor-pointer"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Take the tour
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-700" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
