"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, MapPin, Home, MoreHorizontal } from "lucide-react";
import type { Group } from "@/lib/db/schema/groups";
import { formatDate } from "@/lib/utils";
import { TripCardShareDrawer } from "./trip-card-share-drawer";
import { GroupActionHub } from "./group-action-hub";

// ── No-cover-photo SVG patterns ──────────────────────────────────────────────
// Two overlay divs toggled via dark:hidden / hidden dark:block.
//
// Trip  → 4 rounded-canopy trees at varying heights — lollipop silhouette
//          (circle canopy + trunk rect + ground-shadow ellipse), 220×110 tile
//          emerald-600 #059669 on pale gradient / white on dark gradient
//          Tree heights from bottom: ~52 px · ~79 px · ~65 px · ~59 px
//
// Nest  → 14-building city skyline, 400×110 tile — wider tile means repeat only
//          triggers once per card; 2 px gaps between every building; antennae on
//          the two tallest; window grids (3-col or 2-col) on prominent buildings
//          sky-600 #0284c7 on pale gradient / white on dark gradient

// SVG patterns — imported from shared lib so both card and dashboard hero
// use identical visuals.
import {
  TRIP_TREE_LIGHT, TRIP_TREE_DARK, TRIP_PATTERN_STYLE,
  NEST_BUILDING_LIGHT, NEST_BUILDING_DARK, NEST_PATTERN_STYLE,
} from "@/lib/group-patterns";

// ─────────────────────────────────────────────────────────────────────────────

interface TripCardProps {
  group: Group;
  memberCount: number;
  balanceBadge?: React.ReactNode;
  priority?: boolean;
  isPlusPlan?: boolean;
  /** Whether the current user is an admin of this group. Passed to GroupActionHub
   *  so Edit/Archive are only shown to admins. Defaults to false (safe default). */
  isAdmin?: boolean;
}

// ── Trip alive status ─────────────────────────────────────────────────────────

type TripStatusType = "active" | "lastDay" | "justReturned";

interface TripStatus {
  type:  TripStatusType;
  label: string;
  color: string; // Tailwind text colour on the dark image overlay
}

const MS_PER_DAY = 86_400_000;

function computeTripStatus(
  startDate: string | null,
  endDate:   string | null,
): TripStatus | null {
  if (!startDate) return null;

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  if (today < startDate) return null; // upcoming — no badge

  if (endDate && today > endDate) {
    const daysAgo = Math.round(
      (new Date(today).getTime() - new Date(endDate).getTime()) / MS_PER_DAY,
    );
    if (daysAgo > 7) return null; // too long ago
    return { type: "justReturned", label: "Just returned ✓", color: "text-emerald-300" };
  }

  if (endDate && today === endDate) {
    return { type: "lastDay", label: "Last day 🏁", color: "text-amber-300" };
  }

  // Active trip — today is on or after start, before or on end (or no end set)
  const dayNumber = Math.round(
    (new Date(today).getTime() - new Date(startDate).getTime()) / MS_PER_DAY,
  ) + 1;
  const totalDays = endDate
    ? Math.round(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / MS_PER_DAY,
      ) + 1
    : null;
  const label = totalDays ? `Day ${dayNumber} of ${totalDays}` : `Day ${dayNumber}`;
  return { type: "active", label, color: "text-cyan-300" };
}

// ─────────────────────────────────────────────────────────────────────────────

const LONG_PRESS_MS = 500;
// iOS fingers drift slightly even while holding still; only cancel if truly scrolling.
const MOVE_THRESHOLD = 8;

// Quick-nav button — always visible (was desktop-only before Phase 1 UX improvements)
const moreBtn =
  "flex w-10 h-10 md:w-8 md:h-8 rounded-xl items-center justify-center text-white bg-black/30 hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/20 active:scale-95 transition-all";

export function TripCard({ group, memberCount, balanceBadge, priority = false, isPlusPlan = false, isAdmin = false }: TripCardProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = `${appUrl}/join/${group.shareToken}`;
  const isNest     = group.groupType === "nest";
  const tripStatus = !isNest && !group.isArchived
    ? computeTripStatus(group.startDate, group.endDate)
    : null;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Long-press fires touchend AND a subsequent click event. This ref lets the
  // Link's onClick block that click so a long-press opens the nav sheet instead
  // of navigating.
  const suppressNextClick = useRef(false);
  // When the QR dialog closes its backdrop unmounts before touchend fires.
  // React stops processing synthetic events on unmounted elements, so the card's
  // onTouchEnd={cancelLongPress} never runs — leaving the 500ms timer live.
  // Explicitly cancel the timer here, and block the ⋯ button for 300ms to
  // absorb the stray click event that fires after the backdrop disappears.
  const navBlockedRef = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Tour: programmatically open nav sheet via custom event dispatched by tour-context
  useEffect(() => {
    function onTourOpen(e: Event) {
      if ((e as CustomEvent).detail === group.id) setIsNavOpen(true);
    }
    window.addEventListener("open-demo-navsheet", onTourOpen);
    return () => window.removeEventListener("open-demo-navsheet", onTourOpen);
  }, [group.id]);

  function handleShareOpenChange(open: boolean) {
    if (!open) {
      cancelLongPress();
      navBlockedRef.current = true;
      setTimeout(() => { navBlockedRef.current = false; }, 300);
    }
  }

  function startLongPress(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      suppressNextClick.current = true;
      setIsLongPressing(false);
      // Vibration API: works on Android, silently unavailable on iOS Safari.
      try { navigator.vibrate?.(12); } catch { /* not available */ }
      setIsNavOpen(true);
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartPos.current) return;
    const t = e.touches[0];
    const moved =
      Math.abs(t.clientX - touchStartPos.current.x) > MOVE_THRESHOLD ||
      Math.abs(t.clientY - touchStartPos.current.y) > MOVE_THRESHOLD;
    if (moved) cancelLongPress();
  }

  function cancelLongPress() {
    setIsLongPressing(false);
    touchStartPos.current = null;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    // Outer div: positioning context for action buttons, hover effects, touch handlers.
    // No overflow-hidden here — that lives on the inner glass div so buttons aren't clipped.
    <div
      className={`group/card relative select-none transition-all ${isNest ? "shadow-md shadow-emerald-500/15 hover:shadow-xl hover:shadow-emerald-500/30" : "shadow-md shadow-cyan-500/15 hover:shadow-xl hover:shadow-cyan-500/30"} hover:-translate-y-0.5 ${isLongPressing ? "scale-[0.97] duration-500" : "duration-200"}`}
      data-tour={group.isDemo ? (isNest ? "demo-nest" : "demo-trip") : undefined}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={handleTouchMove}
      onTouchCancel={cancelLongPress}
      onContextMenu={(e) => { if (suppressNextClick.current) e.preventDefault(); }}
      style={{ WebkitTouchCallout: "none", touchAction: "manipulation" } as React.CSSProperties}
    >
      {/* Cyan ring that appears during long-press to signal the gesture is registered */}
      {isLongPressing && (
        <div className="absolute inset-0 z-20 rounded-2xl ring-2 ring-cyan-400/70 pointer-events-none" />
      )}
      {/* Type + member count badges — on outer div so member count can be its own Link
          (can't nest <a> inside the card's main <Link>). Same pattern as action buttons. */}
      <div
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5"
        onTouchStart={(e) => e.stopPropagation()}
      >
        <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full pointer-events-none">
          {isNest ? <Home className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
          {isNest ? "Nest" : "Trip"}
        </span>
        <Link
          href={`/groups/${group.id}/members`}
          className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full hover:bg-black/60 active:scale-95 transition-all"
          onClick={(e) => { if (suppressNextClick.current) e.preventDefault(); }}
        >
          <Users className="w-3 h-3" />
          {memberCount}
        </Link>
      </div>

      {/* Inner div: glass surface + overflow-hidden for image clipping and ribbon */}
      <div className={`relative glass rounded-2xl overflow-hidden${group.isDemo ? " ring-2 ring-amber-400/40" : group.isArchived ? " ring-2 ring-slate-400/30" : ""}`}>
        <Link
          href={`/groups/${group.id}`}
          className="block"
          onClick={(e) => {
            if (suppressNextClick.current) {
              e.preventDefault();
              suppressNextClick.current = false;
            }
          }}
        >
          <div className="h-44 relative">
            {group.coverPhotoUrl ? (
              <Image
                src={group.coverPhotoUrl}
                alt={group.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover"
                priority={priority}
              />
            ) : (
              <>
                {/* Vivid identity gradient — matches dashboard hero exactly.
                    Trip: cyan-500→teal-500 · Nest: emerald-500→teal-500 */}
                <div className={`w-full h-full bg-gradient-to-br ${
                  isNest ? "from-emerald-500 to-teal-500" : "from-cyan-500 to-teal-500"
                }`} />
                {/* White pattern shapes — no light/dark split needed; white reads on
                    any vivid background in both modes */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: isNest ? NEST_BUILDING_DARK : TRIP_TREE_DARK,
                    ...(isNest ? NEST_PATTERN_STYLE : TRIP_PATTERN_STYLE),
                  }}
                />
              </>
            )}
            {/* Legibility overlay — same strength for photos and vivid-gradient no-photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />


            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="text-white text-xl truncate" style={{ fontFamily: "var(--font-fraunces)" }}>
                {group.name}
              </h3>
              {isNest ? (
                <p className="text-white/75 text-xs mt-0.5">
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </p>
              ) : tripStatus ? (
                /* Alive status replaces the date line when the trip is active/recent */
                <div className="flex items-center gap-1.5 mt-0.5">
                  {tripStatus.type === "active" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  )}
                  <span className={`text-xs font-semibold ${tripStatus.color}`}>
                    {tripStatus.label}
                  </span>
                </div>
              ) : (group.startDate || group.endDate) ? (
                <p className="text-white/75 text-xs mt-0.5">
                  {group.startDate ? formatDate(group.startDate) : ""}
                  {group.startDate && group.endDate ? " → " : ""}
                  {group.endDate ? formatDate(group.endDate) : ""}
                </p>
              ) : null}
            </div>
          </div>
        </Link>
        {(balanceBadge || isPlusPlan) ? (
          <Link
            href={`/groups/${group.id}/settle`}
            className="block relative"
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => { if (suppressNextClick.current) e.preventDefault(); }}
          >
            {balanceBadge}
            {isPlusPlan && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-violet-400/80 dark:text-violet-400/70 tracking-wide">
                ✦ Plus
              </span>
            )}
          </Link>
        ) : null}
        {/* Diagonal ribbon — now relative to the full card (image + badge), stays consistent */}
        {group.isDemo && (
          <div className="absolute bottom-[22px] right-[-30px] w-[130px] rotate-[-45deg] bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold py-1.5 text-center tracking-widest shadow-sm pointer-events-none">
            SAMPLE
          </div>
        )}
        {group.isArchived && !group.isDemo && (
          <div className="absolute bottom-[22px] right-[-30px] w-[130px] rotate-[-45deg] bg-slate-500/80 backdrop-blur-sm text-white text-[10px] font-bold py-1.5 text-center tracking-widest shadow-sm pointer-events-none">
            ARCHIVED
          </div>
        )}
      </div>

      {/* Action buttons — on outer div, outside the Link.
          onTouchStart stopPropagation prevents long-press timer from firing on taps. */}
      <div
        className="absolute top-3 right-3 z-10 flex items-center gap-2 md:gap-1.5"
        onTouchStart={(e) => e.stopPropagation()}
      >
        <TripCardShareDrawer url={joinUrl} groupName={group.name} onShareOpenChange={handleShareOpenChange} />
        <button
          onClick={() => { if (!navBlockedRef.current) setIsNavOpen(true); }}
          className={moreBtn}
          aria-label="Group actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <GroupActionHub
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        groupId={group.id}
        groupName={group.name}
        groupType={group.groupType}
        currency={group.defaultCurrency}
        isArchived={group.isArchived ?? false}
        isAdmin={isAdmin}
        isPlusUser={isPlusPlan}
        joinUrl={joinUrl}
        groupStartDate={group.startDate}
        groupEndDate={group.endDate}
      />
    </div>
  );
}
