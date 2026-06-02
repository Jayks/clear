"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, MapPin, Home, MoreHorizontal } from "lucide-react";
import type { Group } from "@/lib/db/schema/groups";
import { formatDate } from "@/lib/utils";
import { TripCardShareDrawer } from "./trip-card-share-drawer";
import { TripCardQuickAdd } from "./trip-card-quick-add";
import { TripCardNavSheet } from "./trip-card-nav-sheet";

// ── No-cover-photo SVG patterns ──────────────────────────────────────────────
// Mirrors the Circle card approach exactly:
//   • 200×60 tile with backgroundRepeat:"repeat" → tiles across the whole h-44 header
//   • Light mode: coloured strokes on pale gradient  (pops clearly)
//   • Dark mode:  white strokes on deep dark gradient (pops clearly)
// Two overlay divs toggled via dark:hidden / hidden dark:block.
//
// Trip  → 4 two-tier pine trees — travel, outdoors, nature  (cyan-600 #0891b2)
// Nest  → 4 apartment blocks with window grids — home, urban (teal-600 #0d9488)

// Trip  → 4 two-tier pine trees, 200×110 tile — repeat-x anchored to the bottom
//          so the treeline rises ~63 % of the way up the card (110 / 176 px)
// Nest  → 4 apartment blocks with window grids, same tile size

const TRIP_TREE_LIGHT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='110'%3E%3Cpolygon points='3,110 20,72 37,110' fill='%23059669' fill-opacity='0.22'/%3E%3Cpolygon points='7,88 20,50 33,88' fill='%23059669' fill-opacity='0.28'/%3E%3Crect x='17.5' y='103' width='5' height='8' fill='%23059669' fill-opacity='0.18'/%3E%3Cpolygon points='44,110 68,54 92,110' fill='%23059669' fill-opacity='0.22'/%3E%3Cpolygon points='50,78 68,12 86,78' fill='%23059669' fill-opacity='0.28'/%3E%3Crect x='65' y='103' width='6' height='8' fill='%23059669' fill-opacity='0.18'/%3E%3Cpolygon points='100,110 122,64 144,110' fill='%23059669' fill-opacity='0.22'/%3E%3Cpolygon points='106,84 122,28 138,84' fill='%23059669' fill-opacity='0.28'/%3E%3Crect x='119.5' y='103' width='5' height='8' fill='%23059669' fill-opacity='0.18'/%3E%3Cpolygon points='157,110 175,74 193,110' fill='%23059669' fill-opacity='0.22'/%3E%3Cpolygon points='161,90 175,54 189,90' fill='%23059669' fill-opacity='0.28'/%3E%3Crect x='172.5' y='103' width='5' height='8' fill='%23059669' fill-opacity='0.18'/%3E%3C/svg%3E")`;

const TRIP_TREE_DARK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='110'%3E%3Cpolygon points='3,110 20,72 37,110' fill='white' fill-opacity='0.13'/%3E%3Cpolygon points='7,88 20,50 33,88' fill='white' fill-opacity='0.17'/%3E%3Crect x='17.5' y='103' width='5' height='8' fill='white' fill-opacity='0.10'/%3E%3Cpolygon points='44,110 68,54 92,110' fill='white' fill-opacity='0.13'/%3E%3Cpolygon points='50,78 68,12 86,78' fill='white' fill-opacity='0.17'/%3E%3Crect x='65' y='103' width='6' height='8' fill='white' fill-opacity='0.10'/%3E%3Cpolygon points='100,110 122,64 144,110' fill='white' fill-opacity='0.13'/%3E%3Cpolygon points='106,84 122,28 138,84' fill='white' fill-opacity='0.17'/%3E%3Crect x='119.5' y='103' width='5' height='8' fill='white' fill-opacity='0.10'/%3E%3Cpolygon points='157,110 175,74 193,110' fill='white' fill-opacity='0.13'/%3E%3Cpolygon points='161,90 175,54 189,90' fill='white' fill-opacity='0.17'/%3E%3Crect x='172.5' y='103' width='5' height='8' fill='white' fill-opacity='0.10'/%3E%3C/svg%3E")`;

const NEST_BUILDING_LIGHT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='110'%3E%3Crect x='2' y='58' width='33' height='52' fill='%230284c7' fill-opacity='0.22'/%3E%3Crect x='8' y='64' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='20' y='64' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='8' y='74' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='20' y='74' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='8' y='84' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='20' y='84' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='8' y='94' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='20' y='94' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='43' y='12' width='48' height='98' fill='%230284c7' fill-opacity='0.22'/%3E%3Crect x='49' y='19' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='19' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='19' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='49' y='29' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='29' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='29' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='49' y='39' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='39' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='39' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='49' y='49' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='49' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='49' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='49' y='59' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='59' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='59' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='49' y='69' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='69' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='69' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='49' y='79' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='79' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='79' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='49' y='89' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='89' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='89' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='49' y='99' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='61' y='99' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='74' y='99' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='99' y='42' width='30' height='68' fill='%230284c7' fill-opacity='0.22'/%3E%3Crect x='104' y='49' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='116' y='49' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='104' y='59' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='116' y='59' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='104' y='69' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='116' y='69' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='104' y='79' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='116' y='79' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='104' y='89' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='116' y='89' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='104' y='99' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='116' y='99' width='7' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='137' y='22' width='56' height='88' fill='%230284c7' fill-opacity='0.22'/%3E%3Crect x='143' y='29' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='156' y='29' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='169' y='29' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='143' y='39' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='156' y='39' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='169' y='39' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='143' y='49' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='156' y='49' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='169' y='49' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='143' y='59' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='156' y='59' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='169' y='59' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='143' y='69' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='156' y='69' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='169' y='69' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='143' y='79' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='156' y='79' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='169' y='79' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='143' y='89' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='156' y='89' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='169' y='89' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='143' y='99' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='156' y='99' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3Crect x='169' y='99' width='8' height='5' fill='%230284c7' fill-opacity='0.44'/%3E%3C/svg%3E")`;

const NEST_BUILDING_DARK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='110'%3E%3Crect x='2' y='58' width='33' height='52' fill='white' fill-opacity='0.12'/%3E%3Crect x='8' y='64' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='20' y='64' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='8' y='74' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='20' y='74' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='8' y='84' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='20' y='84' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='8' y='94' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='20' y='94' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='43' y='12' width='48' height='98' fill='white' fill-opacity='0.12'/%3E%3Crect x='49' y='19' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='19' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='19' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='49' y='29' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='29' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='29' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='49' y='39' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='39' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='39' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='49' y='49' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='49' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='49' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='49' y='59' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='59' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='59' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='49' y='69' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='69' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='69' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='49' y='79' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='79' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='79' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='49' y='89' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='89' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='89' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='49' y='99' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='61' y='99' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='74' y='99' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='99' y='42' width='30' height='68' fill='white' fill-opacity='0.12'/%3E%3Crect x='104' y='49' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='116' y='49' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='104' y='59' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='116' y='59' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='104' y='69' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='116' y='69' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='104' y='79' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='116' y='79' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='104' y='89' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='116' y='89' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='104' y='99' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='116' y='99' width='7' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='137' y='22' width='56' height='88' fill='white' fill-opacity='0.12'/%3E%3Crect x='143' y='29' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='156' y='29' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='169' y='29' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='143' y='39' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='156' y='39' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='169' y='39' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='143' y='49' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='156' y='49' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='169' y='49' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='143' y='59' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='156' y='59' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='169' y='59' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='143' y='69' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='156' y='69' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='169' y='69' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='143' y='79' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='156' y='79' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='169' y='79' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='143' y='89' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='156' y='89' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='169' y='89' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='143' y='99' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='156' y='99' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3Crect x='169' y='99' width='8' height='5' fill='white' fill-opacity='0.24'/%3E%3C/svg%3E")`;

const PATTERN_STYLE = {
  backgroundSize: "200px 110px",
  backgroundRepeat: "repeat-x",
  backgroundPosition: "bottom",
} as const;

// ─────────────────────────────────────────────────────────────────────────────

interface TripCardProps {
  group: Group;
  memberCount: number;
  balanceBadge?: React.ReactNode;
  priority?: boolean;
  isPlusPlan?: boolean;
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

export function TripCard({ group, memberCount, balanceBadge, priority = false, isPlusPlan = false }: TripCardProps) {
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
      className={`group/card relative select-none transition-all ${isPlusPlan ? "shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30" : "hover:shadow-xl hover:shadow-cyan-500/10"} hover:-translate-y-0.5 ${isLongPressing ? "scale-[0.97] duration-500" : "duration-200"}`}
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
                {/* Pale gradient — Trip: soft green (outdoors/nature), Nest: soft blue (home/calm) */}
                <div className={`w-full h-full bg-gradient-to-br ${
                  isNest
                    ? "from-sky-50 to-blue-100 dark:from-slate-800 dark:to-blue-900"
                    : "from-emerald-50 to-green-100 dark:from-slate-800 dark:to-emerald-900"
                }`} />
                {/* Light mode pattern — coloured shapes on pale gradient, repeat tiles the whole header */}
                <div
                  className="absolute inset-0 pointer-events-none dark:hidden"
                  style={{
                    backgroundImage: isNest ? NEST_BUILDING_LIGHT : TRIP_TREE_LIGHT,
                    ...PATTERN_STYLE,
                  }}
                />
                {/* Dark mode — white shapes on deep slate gradient */}
                <div
                  className="absolute inset-0 pointer-events-none hidden dark:block"
                  style={{
                    backgroundImage: isNest ? NEST_BUILDING_DARK : TRIP_TREE_DARK,
                    ...PATTERN_STYLE,
                  }}
                />
              </>
            )}
            {/* Legibility overlay — lighter for no-photo (pale bg stays visible); darker for photos */}
            <div className={`absolute inset-0 bg-gradient-to-t ${
              group.coverPhotoUrl
                ? "from-slate-900/70 via-slate-900/20"
                : "from-slate-900/55 via-slate-900/10"
            } to-transparent`} />


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
          groupType={group.groupType}
          currency={group.defaultCurrency}
          groupStartDate={group.startDate}
          groupEndDate={group.endDate}
        />
        <TripCardShareDrawer url={joinUrl} groupName={group.name} onShareOpenChange={handleShareOpenChange} />
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
