"use client";

import { useEffect, useState } from "react";
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
import { LogOut, BarChart2, Home, LayoutDashboard, Settings, Newspaper, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ClearLogo } from "@/components/shared/clear-logo";

// Same nav set + identity colours as the old AppNav top bar (mirrors the
// mobile bottom nav too): Home = cyan, Streams = blue, Insights = amber.
const NAV_LINKS = [
  { href: "/groups",   label: "Home",    icon: Home,           tourId: "nav-trips",
    activeCls: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400" },
  { href: "/stream",   label: "Streams", icon: ArrowLeftRight, tourId: "nav-streams",
    activeCls: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400" },
  { href: "/insights", label: "Insights", icon: BarChart2,     tourId: "nav-insights",
    activeCls: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400" },
];

const COLLAPSE_KEY = "clear_sidebar_collapsed";

/**
 * AppSidebar — desktop-only (md+) replacement for the old horizontal AppNav
 * top bar. Mobile is untouched: AppNav still renders there (icon-only top
 * bar + MobileNav bottom tabs), this component is `hidden` below `md`.
 *
 * Collapsible to an icon-only rail; preference persisted in localStorage.
 * Server always renders expanded (no way to know the cookie-less preference
 * during SSR) — corrected client-side in an effect after mount, same pattern
 * as other dismissable-state UI in this app (read in useEffect, write on
 * toggle, never trust localStorage during the server render).
 */
export default function AppSidebar({ user, isAdmin, plan = "free" }: { user: User; isAdmin: boolean; plan?: "plus" | "free" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [streamBadge, setStreamBadge] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch { /* private browsing / storage disabled — default expanded */ }
  }, []);

  // Same unread/dispute indicator MobileNav shows on its Streams tab — was
  // mobile-only before; worth carrying over now that this sidebar is a
  // permanent fixture rather than an easy-to-miss top bar.
  useEffect(() => {
    const read = () => setStreamBadge(localStorage.getItem("clear_stream_has_badge"));
    read();
    window.addEventListener("stream-badge-update", read);
    return () => window.removeEventListener("stream-badge-update", read);
  }, []);

  useEffect(() => {
    if (pathname === "/stream" || pathname.startsWith("/stream/")) {
      localStorage.removeItem("clear_stream_has_badge");
      localStorage.setItem("clear_stream_last_viewed", String(Date.now()));
      setStreamBadge(null);
    }
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* best-effort */ }
      return next;
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
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
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-50",
        "bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-r border-slate-100 dark:border-slate-800/60",
        "transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}
      aria-label="Main navigation"
    >
      {/* Logo + collapse toggle (toggle moves below when collapsed — no room beside the icon) */}
      <div className={cn("flex items-center h-14 shrink-0", collapsed ? "justify-center" : "justify-between px-4")}>
        <Link href="/groups" className="flex items-center shrink-0" aria-label="ClearOff home">
          <ClearLogo
            iconSize={28}
            showWordmark={!collapsed}
            wordmarkClassName="text-xl text-slate-800 dark:text-slate-100"
            className="flex items-center gap-2"
          />
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <div className="flex justify-center pb-2 -mt-1">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 px-2.5 mt-1">
        {NAV_LINKS.map(({ href, label, icon: Icon, tourId, activeCls }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge  = href === "/stream" ? streamBadge : null;
          return (
            <Link
              key={href}
              href={href}
              data-tour={tourId}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? activeCls
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
              )}
            >
              <span className="relative shrink-0">
                <Icon className="w-4 h-4" />
                {badge && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-950",
                      badge === "disputed" ? "bg-amber-500" : "bg-emerald-500",
                    )}
                  />
                )}
              </span>
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — theme toggle + avatar/menu */}
      <div className={cn(
        "flex items-center gap-2 px-2.5 py-3 border-t border-slate-100 dark:border-slate-800/60",
        collapsed && "flex-col gap-2.5"
      )}>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button className="min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-full" />}
          >
            <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-white shadow-sm relative">
              {plan === "plus" && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 ring-2 ring-white dark:ring-slate-900 z-10 flex items-center justify-center">
                  <span className="text-white text-[7px] leading-none">✦</span>
                </span>
              )}
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name ?? "User"} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-teal-500 text-white text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          {/* side="right": the sidebar sits at the screen's left edge, so opening
              downward (the old top-bar default) would frequently clip against the
              bottom of the viewport since the trigger itself is already near the
              bottom. align="end" keeps the menu's bottom edge anchored to the
              trigger instead of growing past the viewport. */}
          <DropdownMenuContent side="right" align="end" className="w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-black/8 dark:shadow-black/40 rounded-xl">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span className="truncate">{user.user_metadata?.full_name ?? "User"}</span>
                {plan === "plus" && (
                  <span className="text-[10px] font-semibold text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 px-1.5 py-0.5 rounded-full shrink-0">✦ Plus</span>
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-700" />
            {isAdmin && (
              <DropdownMenuItem
                onClick={() => {
                  window.dispatchEvent(new Event("navprogress"));
                  window.location.href = "/admin";
                }}
                className="cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuItem render={<Link href="/changelog" />} className="cursor-pointer">
              <Newspaper className="w-4 h-4 mr-2" />
              What&apos;s New
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />} className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              Settings
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
    </aside>
  );
}
