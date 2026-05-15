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

const floatBtn =
  "w-8 h-8 rounded-xl flex items-center justify-center text-white bg-black/30 hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/20 active:scale-95 transition-all";

export function TripCard({ group, memberCount }: TripCardProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = `${appUrl}/join/${group.shareToken}`;
  const isNest = group.groupType === "nest";

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextClick = useRef(false);

  function startLongPress() {
    longPressTimer.current = setTimeout(() => {
      suppressNextClick.current = true;
      setIsNavOpen(true);
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div
      className={`group/card glass rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-200 hover:-translate-y-0.5 select-none${group.isDemo ? " ring-2 ring-amber-400/40" : ""}`}
      data-tour={group.isDemo ? (isNest ? "demo-nest" : "demo-trip") : undefined}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onTouchCancel={cancelLongPress}
      style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
    >
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

          {/* Sample ribbon — bottom-right corner diagonal */}
          {group.isDemo && (
            <div className="absolute bottom-[22px] right-[-30px] w-[130px] rotate-[-45deg] bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold py-1.5 text-center tracking-widest shadow-sm pointer-events-none">
              SAMPLE
            </div>
          )}

          {/* Action buttons — top right */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <TripCardQuickAdd
              groupId={group.id}
              groupName={group.name}
              currency={group.defaultCurrency}
              groupStartDate={group.startDate}
              groupEndDate={group.endDate}
            />
            <TripCardShareButtons url={joinUrl} groupName={group.name} />
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsNavOpen(true); }}
              className={floatBtn}
              aria-label="Quick navigation"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

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

      <TripCardNavSheet
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        groupId={group.id}
        groupName={group.name}
      />
    </div>
  );
}
