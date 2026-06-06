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
