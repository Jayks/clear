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
 * Computes the `revealed` fraction for Mapbox `line-trim-offset`.
 *
 * `[0, 0]`  → entire path visible  (all dates shown, "All" button state)
 * `[0, 1]`  → entire path hidden   (no dates visible)
 * `[rev, 1]`→ first `rev` fraction shown chronologically
 *
 * @param scrubDate  The currently selected date, or null for "show all".
 * @param scrubDates The full ordered list from `computeScrubDates`.
 * @returns          The `revealed` fraction in [0, 1].
 */
export function computeRevealFraction(
  scrubDate: string | null,
  scrubDates: string[],
): number {
  if (!scrubDate || scrubDates.length === 0) return 1; // show all
  const totalDays = Math.max(scrubDates.length - 1, 1);
  const idx = scrubDates.indexOf(scrubDate);
  if (idx < 0) return 1; // unknown date — show all
  return idx / totalDays;
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
