/**
 * Pure helper functions for the Expense Map View.
 * Extracted from the component so they can be unit-tested without a browser.
 */

import { parseISO, eachDayOfInterval, format } from "date-fns";
import { parseExpenseLocation } from "../db/schema/expenses";
import type { Expense } from "../db/schema/expenses";

// ── Active trip detection ─────────────────────────────────────────────────────

/**
 * Returns true when `today` (YYYY-MM-DD string) falls within [startDate, endDate].
 * Both bounds are inclusive. Returns false when either date is missing.
 */
export function isTripActive(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  today: string,
): boolean {
  if (!startDate || !endDate) return false;
  return today >= startDate && today <= endDate;
}

// ── Scrub-date list ───────────────────────────────────────────────────────────

/**
 * Builds the ordered list of dates shown in the timeline scrubber.
 *
 * - When the trip has both `startDate` and `endDate`: returns every calendar
 *   day in the interval (inclusive), formatted "yyyy-MM-dd".
 * - Otherwise: returns the unique, sorted set of actual expense dates.
 */
export function computeScrubDates(
  groupStartDate: string | null | undefined,
  groupEndDate: string | null | undefined,
  expenseDates: string[],
): string[] {
  if (groupStartDate && groupEndDate) {
    try {
      return eachDayOfInterval({
        start: parseISO(groupStartDate),
        end:   parseISO(groupEndDate),
      }).map((d) => format(d, "yyyy-MM-dd"));
    } catch {
      // Malformed date — fall through to expense-date list
    }
  }
  return [...new Set(expenseDates)].sort();
}

// ── line-trim-offset reveal fraction ─────────────────────────────────────────

/**
 * Computes the `revealed` fraction for Mapbox `line-trim-offset` BY ROUTE
 * DISTANCE — the same way Mapbox's `line-progress` normalizes internally
 * (cumulative great-circle length, not vertex count). This is the fraction
 * that must drive both `setPaintProperty(..., "line-trim-offset", ...)` AND
 * `pointAlongLine` for the visible line and the leading-edge marker to ever
 * agree on "where today is" along the route.
 *
 * Reveals through the LAST waypoint whose `expenseDate` is on or before
 * `scrubDate` (everything strictly later stays hidden) — i.e. "show
 * everywhere we'd been by the end of this day".
 *
 * `locations` must be the exact chronologically-sorted geometry used to
 * build the `trip-path` LineString (see `routeLocations` in the component) —
 * any divergence desyncs the line from the marker again.
 *
 * @returns The `revealed` fraction in [0, 1]. `1` for "show all" (no
 * scrubDate), fewer than 2 locations, or a zero-length route.
 */
export function computeDistanceRevealFraction(
  scrubDate: string | null,
  locations: { lat: number; lng: number; expenseDate: string }[],
): number {
  if (!scrubDate || locations.length < 2) return 1;

  const segmentKm: number[] = [];
  let totalKm = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const km = haversineDistanceKm(locations[i], locations[i + 1]);
    segmentKm.push(km);
    totalKm += km;
  }
  if (totalKm === 0) return 1; // every point identical — nothing to reveal incrementally

  let cumKm = 0;
  let revealedKm = 0;
  let matchedAny = false;
  for (let i = 0; i < locations.length; i++) {
    if (locations[i].expenseDate <= scrubDate) {
      revealedKm = cumKm;
      matchedAny = true;
    }
    if (i < segmentKm.length) cumKm += segmentKm[i];
  }
  if (!matchedAny) return 0; // scrubbed to a date before the route begins

  return Math.min(revealedKm / totalKm, 1);
}

// ── Index-based reveal fraction (sub-day stepping) ────────────────────────────

/**
 * Same distance-based normalization as `computeDistanceRevealFraction`, but
 * reveals "through waypoint at `throughIndex`" (inclusive) rather than
 * "through the last waypoint on/before a date". Powers sub-day stepping —
 * walking a multi-stop day's distinct locations one at a time (cinema replay
 * AND manual scrub both pause to sequence through them) instead of dumping
 * the whole day's stretch of route in one jump, which is what prompted this:
 * a cluster of same-day pins used to all "appear at once".
 *
 * `throughIndex < 0` reveals nothing (0); `throughIndex >= locations.length - 1`
 * reveals everything (1) — mirrors the date-based helper's boundary behavior so
 * the two stay visually consistent at a day's start/end (the "day complete"
 * sub-step must land on EXACTLY the same fraction `computeDistanceRevealFraction`
 * would produce, or the line would visibly jump when the sequence finishes).
 *
 * @returns The `revealed` fraction in [0, 1].
 */
export function computeDistanceRevealFractionThroughIndex(
  throughIndex: number,
  locations: { lat: number; lng: number }[],
): number {
  if (locations.length < 2) return 1;

  const segmentKm: number[] = [];
  let totalKm = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const km = haversineDistanceKm(locations[i], locations[i + 1]);
    segmentKm.push(km);
    totalKm += km;
  }
  // Every point identical — nothing to reveal incrementally (checked BEFORE
  // the index bounds below: an all-zero route is "fully revealed" regardless
  // of which index you're "at", matching computeDistanceRevealFraction).
  if (totalKm === 0) return 1;

  if (throughIndex <= 0) return 0;
  if (throughIndex >= locations.length - 1) return 1;

  // "Revealed through waypoint i" = distance travelled to ARRIVE at waypoint
  // i — i.e. the segments that lead INTO it (0..i-1), not the one departing
  // FROM it. This mirrors `computeDistanceRevealFraction`'s exact accumulation
  // order (its `revealedKm = cumKm` snapshot happens BEFORE `cumKm` absorbs
  // the current waypoint's outgoing segment) — get this backwards and the
  // "day complete" sub-step lands ~2% short of where the date-based reveal
  // would be, producing a visible micro-jump at the hand-off.
  let revealedKm = 0;
  for (let i = 0; i < throughIndex; i++) revealedKm += segmentKm[i];
  return Math.min(revealedKm / totalKm, 1);
}

// ── Same-day stop grouping (sub-day stepping) ─────────────────────────────────

/**
 * Groups same-day locations into distinct "stops" by EXACT coordinate —
 * mirroring the duplicate-coordinate detection the marker fan-out offset
 * already relies on (`seenAt` in the map component). Two expenses logged at
 * the identical lat/lng (three meals all tagged "Hotel Taj, Chennai") are the
 * same physical stop and must reveal/pan together as one beat — hopping the
 * camera between identical coordinates would be a pointless, disorienting
 * non-move ("the cluster should have different locations — only then does
 * one-by-one stepping make sense").
 *
 * Preserves the input's order (first-seen coordinate determines the group's
 * position in the result) — callers pass chronologically-sorted input so the
 * groups come out in "the order things happened" too.
 */
export function groupLocationsIntoStops<T extends { lat: number; lng: number }>(
  locations: T[],
): T[][] {
  const order: string[] = [];
  const groups = new Map<string, T[]>();
  for (const loc of locations) {
    const key = `${loc.lat},${loc.lng}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(loc);
    } else {
      groups.set(key, [loc]);
      order.push(key);
    }
  }
  return order.map((key) => groups.get(key)!);
}

// ── Located-expense filter ────────────────────────────────────────────────────

/**
 * Filters an expense list to only those with a valid `location` jsonb value.
 * Uses the `parseExpenseLocation` type guard — never casts directly.
 */
export function getLocatedExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => parseExpenseLocation(e.location) !== null);
}

// ── Map pin category emoji ────────────────────────────────────────────────────

/**
 * One emoji per category — used as a lightweight visual anchor on individual
 * map pin chips. Mapbox HTML markers are plain DOM nodes outside React's tree,
 * so a Lucide <CategoryIcon> can't be dropped in directly; an emoji string is
 * the simplest faithful option (and matches the mental shorthand people already
 * reach for — "🍽 lunch", "🏨 hotel" — with zero rendering machinery).
 * Mirrors the full key set of CATEGORY_HEX (trip + nest + circle categories).
 */
export const CATEGORY_EMOJI: Record<string, string> = {
  food:          "🍽",
  accommodation: "🏨",
  transport:     "🚗",
  sightseeing:   "📸",
  shopping:      "🛍",
  activities:    "🎟",
  groceries:     "🛒",
  tour_package:  "🎒",
  rent:          "🏠",
  utilities:     "⚡",
  subscriptions: "💳",
  healthcare:    "❤️",
  maintenance:   "🔧",
  supplies:      "📦",
  venue:         "🏛",
  gift:          "🎁",
  equipment:     "🔧",
  other:         "📍",
};

/** Fallback emoji for unknown/missing category values. */
export const CATEGORY_EMOJI_FALLBACK = "📍";

/** Looks up the emoji for a category, falling back to a generic pin marker. */
export function getCategoryEmoji(category: string | null | undefined): string {
  if (!category) return CATEGORY_EMOJI_FALLBACK;
  return CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI_FALLBACK;
}

// ── Word-boundary truncation ──────────────────────────────────────────────────

/**
 * Truncates `text` to at most `maxLength` characters, cutting at the last word
 * boundary before the limit (never mid-word) and appending "…".
 *
 * "Lunch at Saravana Bhavan" @ 18 → "Lunch at…" (not the awkward "Lunch at Sa…")
 * Falls back to a hard cut only when there's no space to break on.
 */
export function truncateAtWord(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

// ── Animation easing / interpolation ──────────────────────────────────────────

/**
 * Cubic ease-out: starts fast, settles gently into the target. Used to animate
 * the trip-path `line-trim-offset` reveal smoothly in sync with the camera's
 * `easeTo`/`fitBounds` pan (also 500ms) — without this, the route line snaps
 * instantly to its new revealed length while the camera glides, which reads as
 * "the line isn't animating" relative to the moving viewport.
 */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/** Linear interpolation between `from` and `to` at fraction `t` (not clamped — callers control range). */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// ── Cross-location distance (for "spread out" detection) ─────────────────────

/**
 * Approximate great-circle distance between two coordinates, in kilometres
 * (haversine formula). Precision to the nearest km is more than enough for a
 * "should we fitBounds instead of centroid-pan?" threshold check.
 */
export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Walks `fraction` (0–1) of a polyline's total great-circle length and returns
 * the interpolated `{ lat, lng }` at that point — i.e. the geographic position
 * corresponding to a given Mapbox `line-progress` value.
 *
 * Powers the "leading edge" marker that rides the tip of the trip-path's
 * reveal animation: at any instant its position must match exactly where the
 * `line-trim-offset` trim currently ends, or the marker visibly detaches from
 * the line it's meant to be tracing. Distance is measured the same way for
 * every segment (haversine, matching how `line-progress` is normalized by
 * cumulative length, not by waypoint count) — so the marker naturally glides
 * faster across long inter-city hops and slower through dense same-city
 * clusters, exactly mirroring how the revealed line itself grows.
 *
 * Returns `null` when there's no line to walk (fewer than 2 points).
 */
export function pointAlongLine(
  locations: { lat: number; lng: number }[],
  fraction: number,
): { lat: number; lng: number } | null {
  if (locations.length < 2) return null;
  const t = Math.min(Math.max(fraction, 0), 1);

  const segmentKm: number[] = [];
  let totalKm = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const km = haversineDistanceKm(locations[i], locations[i + 1]);
    segmentKm.push(km);
    totalKm += km;
  }
  if (totalKm === 0) return locations[0]; // every point identical — nowhere to walk

  const targetKm = t * totalKm;
  let walkedKm = 0;
  for (let i = 0; i < segmentKm.length; i++) {
    const segKm    = segmentKm[i];
    const segEndKm = walkedKm + segKm;
    if (targetKm <= segEndKm || i === segmentKm.length - 1) {
      const segT = segKm === 0 ? 0 : (targetKm - walkedKm) / segKm;
      const a = locations[i];
      const b = locations[i + 1];
      return { lat: lerp(a.lat, b.lat, segT), lng: lerp(a.lng, b.lng, segT) };
    }
    walkedKm = segEndKm;
  }
  return locations[locations.length - 1];
}

/** Above this diagonal span, same-day locations are "spread out" enough that a
 * centroid pan would land on a meaningless midpoint (e.g. Chennai↔Delhi) —
 * fitBounds should be used instead so both ends stay visible. */
export const SPREAD_OUT_THRESHOLD_KM = 50;

/**
 * Returns true when the locations span more than `SPREAD_OUT_THRESHOLD_KM` —
 * i.e. a single `easeTo(centroid)` would not meaningfully show all of them and
 * `fitBounds` should be preferred. Compares every pair (locations lists are
 * small — a handful of expenses per day, never a performance concern).
 */
export function isSpreadOut(locations: { lat: number; lng: number }[]): boolean {
  if (locations.length < 2) return false;
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      if (haversineDistanceKm(locations[i], locations[j]) > SPREAD_OUT_THRESHOLD_KM) {
        return true;
      }
    }
  }
  return false;
}
