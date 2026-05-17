"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, MapPin, Home, MoreHorizontal } from "lucide-react";
import type { Group } from "@/lib/db/schema/groups";
import { formatDate } from "@/lib/utils";
import { TripCardShareButtons } from "./trip-card-share-buttons";
import { TripCardQuickAdd } from "./trip-card-quick-add";
import { TripCardNavSheet } from "./trip-card-nav-sheet";

interface TripCardProps {
  group: Group;
  memberCount: number;
}

const LONG_PRESS_MS = 500;
// iOS fingers drift slightly even while holding still; only cancel if truly scrolling.
const MOVE_THRESHOLD = 8;

// Desktop-only quick-nav button — long-press handles this on mobile
const moreBtn =
  "hidden md:flex w-8 h-8 rounded-xl items-center justify-center text-white bg-black/30 hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/20 active:scale-95 transition-all";

export function TripCard({ group, memberCount }: TripCardProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = `${appUrl}/join/${group.shareToken}`;
  const isNest = group.groupType === "nest";

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

  function handleQrOpenChange(open: boolean) {
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
      className={`group/card relative hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-0.5 select-none transition-all ${isLongPressing ? "scale-[0.97] duration-500" : "duration-200"}`}
      data-tour={group.isDemo ? (isNest ? "demo-nest" : "demo-trip") : undefined}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={handleTouchMove}
      onTouchCancel={cancelLongPress}
      style={{ WebkitTouchCallout: "none", touchAction: "manipulation" } as React.CSSProperties}
    >
      {/* Cyan ring that appears during long-press to signal the gesture is registered */}
      {isLongPressing && (
        <div className="absolute inset-0 z-20 rounded-2xl ring-2 ring-cyan-400/70 pointer-events-none" />
      )}
      {/* Inner div: glass surface + overflow-hidden for image clipping and ribbon */}
      <div className={`glass rounded-2xl overflow-hidden${group.isDemo ? " ring-2 ring-amber-400/40" : group.isArchived ? " ring-2 ring-slate-400/30" : ""}`}>
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
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${isNest ? "from-teal-500 to-emerald-500" : "from-cyan-500 to-teal-500"}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />

            {/* Type + member count badges — top left */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {isNest ? <Home className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {isNest ? "Nest" : "Trip"}
              </span>
              <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3" />
                {memberCount}
              </span>
            </div>

            {/* Diagonal ribbon — bottom-right corner, clipped by overflow-hidden */}
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

            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="text-white text-xl truncate" style={{ fontFamily: "var(--font-fraunces)" }}>
                {group.name}
              </h3>
              {isNest ? (
                <p className="text-white/75 text-xs mt-0.5">Shared tab</p>
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
      </div>

      {/* Action buttons — positioned on the outer div, outside the Link entirely.
          onTouchStart stopPropagation prevents touches on these buttons (and their
          portals — QuickAddSheet, QR Dialog) from bubbling to the outer card div's
          startLongPress handler, which would otherwise start a 500ms nav-sheet timer. */}
      <div
        className="absolute top-3 right-3 z-10 flex items-center gap-2 md:gap-1.5"
        onTouchStart={(e) => e.stopPropagation()}
      >
        <TripCardQuickAdd
          groupId={group.id}
          groupName={group.name}
          currency={group.defaultCurrency}
          groupStartDate={group.startDate}
          groupEndDate={group.endDate}
        />
        <TripCardShareButtons url={joinUrl} groupName={group.name} onQrOpenChange={handleQrOpenChange} />
        <button
          onClick={() => { if (!navBlockedRef.current) setIsNavOpen(true); }}
          className={moreBtn}
          aria-label="Quick navigation"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <TripCardNavSheet
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        groupId={group.id}
        groupName={group.name}
      />
    </div>
  );
}
