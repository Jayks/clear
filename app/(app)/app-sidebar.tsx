"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import {
  LogOut, BarChart2, LayoutDashboard, Settings, Newspaper,
  ArrowLeftRight, ChevronLeft, ChevronRight,
  MapPin, Building2, Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ClearLogo } from "@/components/shared/clear-logo";

// ── Group-type navigation (Trips / Nests / Circles) ──────────────────────────
// First-class destinations: each links to a focused type-filtered view.
// tourId migrated from the old "Home" link to Trips (primary groups entry point).
const GROUP_TYPE_LINKS = [
  {
    href: "/groups?type=trips",
    label: "Trips",
    icon: MapPin,
    type: "trips" as const,
    tourId: "nav-trips",
    activeCls: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400",
  },
  {
    href: "/groups?type=nests",
    label: "Nests",
    icon: Building2,
    type: "nests" as const,
    activeCls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  {
    href: "/groups?type=circles",
    label: "Circles",
    icon: Coins,
    type: "circles" as const,
    activeCls: "text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400",
  },
] as const;

// ── Other feature navigation (below separator) ────────────────────────────────
const FEATURE_NAV_LINKS = [
  {
    href: "/stream",
    label: "Streams",
    icon: ArrowLeftRight,
    tourId: "nav-streams",
    activeCls: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400",
  },
  {
    href: "/insights",
    label: "Insights",
    icon: BarChart2,
    tourId: "nav-insights",
    activeCls: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400",
  },
] as const;

const COLLAPSE_KEY = "clear_sidebar_collapsed";

const INACTIVE_CLS =
  "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800";

/**
 * AppSidebar — desktop-only (md+) left rail.
 *
 * Navigation hierarchy:
 *   ✈️  Trips    → /groups?type=trips   (cyan)
 *   🏡  Nests    → /groups?type=nests   (emerald)
 *   💰  Circles  → /groups?type=circles  (violet)
 *   ──────────────────────────────────
 *   ↔   Streams  → /stream              (blue)
 *   📊  Insights → /insights            (amber)
 *
 * Logo at top links to /groups (all-types overview). No "Home" nav item —
 * the logo IS the home button, same as most app-first products.
 *
 * Group-type active state: GroupTypeSyncer (in the groups/[id] layout) writes
 * `clear_current_group_type` to localStorage and dispatches `group-type-change`
 * whenever the user enters or leaves a group detail page. This sidebar reads
 * that key so Trips/Nests/Circles stays highlighted while browsing a group's
 * sub-pages (settle, expenses, members, insights).
 */
export default function AppSidebar({
  user,
  isAdmin,
  plan = "free",
}: {
  user: User;
  isAdmin: boolean;
  plan?: "plus" | "free";
}) {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const typeParam  = searchParams.get("type"); // "trips" | "nests" | "circles" | null

  const [collapsed,         setCollapsed]         = useState(false);
  const [streamBadge,       setStreamBadge]       = useState<string | null>(null);
  const [currentGroupType,  setCurrentGroupType]  = useState<string | null>(null);

  // ── Collapsed preference (localStorage → no SSR flash) ───────────────────
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch { /* private browsing */ }
  }, []);

  // ── Streams unread / dispute badge ───────────────────────────────────────
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

  // ── Current group type (written by GroupTypeSyncer in groups/[id] layout) ─
  // Re-reads on every pathname change so navigating into / out of a group
  // updates the active type link immediately, even before the custom event fires.
  useEffect(() => {
    const read = () => {
      if (pathname.startsWith("/groups/")) {
        setCurrentGroupType(localStorage.getItem("clear_current_group_type"));
      } else {
        setCurrentGroupType(null);
      }
    };
    read();
    window.addEventListener("group-type-change", read);
    return () => window.removeEventListener("group-type-change", read);
  }, [pathname]);

  // ── Active state helper for type links ───────────────────────────────────
  // Two cases light up a type link:
  //  1. User is on the type-filtered home page (/groups?type=trips)
  //  2. User is inside a group of that type (/groups/[id]/…)
  function isTypeActive(type: "trips" | "nests" | "circles"): boolean {
    const dbMap = { trips: "trip", nests: "nest", circles: "circle" } as const;
    if (pathname === "/groups" && typeParam === type) return true;
    if (pathname.startsWith("/groups/") && currentGroupType === dbMap[type]) return true;
    return false;
  }

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
      {/* ── Logo + collapse toggle ────────────────────────────────────────── */}
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

      {/* ── Nav links ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-1 px-2.5 mt-1">

        {/* Trips / Nests / Circles — group types as first-class destinations */}
        {GROUP_TYPE_LINKS.map(({ href, label, icon: Icon, type, activeCls, ...rest }) => {
          const active  = isTypeActive(type);
          const tourId  = "tourId" in rest ? (rest as { tourId: string }).tourId : undefined;
          return (
            <Link
              key={href}
              href={href}
              data-tour={tourId}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active ? activeCls : INACTIVE_CLS,
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}

        {/* Separator between group types and other features */}
        <div className="my-1.5 mx-0.5 h-px bg-slate-100 dark:bg-slate-800/60" />

        {/* Streams + Insights */}
        {FEATURE_NAV_LINKS.map(({ href, label, icon: Icon, tourId, activeCls }) => {
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
                active ? activeCls : INACTIVE_CLS,
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

      {/* ── Bottom — theme toggle + avatar/menu ───────────────────────────── */}
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
          {/* side="right": sidebar sits at left edge so opening rightward avoids
              clipping; align="end" anchors bottom edge to trigger (near viewport bottom). */}
          <DropdownMenuContent
            side="right"
            align="end"
            className="w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-black/8 dark:shadow-black/40 rounded-xl"
          >
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
