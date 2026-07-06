import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_CURRENCY = "INR";
export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "SGD", "AED", "JPY", "CAD", "AUD", "MYR"] as const;
export const CHART_AXIS_TICK = { fontSize: 10, fill: "#94A3B8" } as const;

// BUG-03 fix: map each supported currency to the correct display locale so
// number grouping matches the currency (e.g. USD → en-US "1,000,000" not
// en-IN "10,00,000").  Falls back to "en-US" for any unsupported currency.
export const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  SGD: "en-SG",
  AED: "ar-AE",
  JPY: "ja-JP",
  CAD: "en-CA",
  AUD: "en-AU",
  MYR: "ms-MY",
};

export function formatCurrency(
  amount: number,
  currency = DEFAULT_CURRENCY,
): string {
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getMemberName(member: {
  displayName?: string | null;
  guestName?: string | null;
}): string {
  return member.displayName ?? member.guestName ?? "Member";
}

export function extractDisplayName(user: {
  user_metadata?: Record<string, unknown> | null;
  email?: string | null;
}): string | null {
  const fullName = user.user_metadata?.full_name;
  return typeof fullName === "string" ? fullName : user.email?.split("@")[0] ?? null;
}

/** Local-timezone "yyyy-MM-dd" — never use toISOString() for calendar dates.
 *  (Round 16 fix #4 — UTC rollback bug: an IST user before 05:30 got
 *  *yesterday* pre-filled by every client form that used toISOString(), and
 *  the "Today" chip actually inserted yesterday.) */
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localYesterdayString(): string {
  return localDateString(new Date(Date.now() - 864e5));
}

/**
 * Returns the best default expense date when none was parsed from user input.
 * - Trip ongoing  → today
 * - Trip not yet started → trip start date
 * - Trip finished → trip start date (retroactive logging)
 * - No trip dates → today
 */
export function smartDefaultDate(
  tripStartDate?: string | null,
  tripEndDate?: string | null
): string {
  const today = localDateString();
  if (!tripStartDate) return today;
  if (today < tripStartDate) return tripStartDate;           // trip hasn't started
  if (tripEndDate && today > tripEndDate) return tripStartDate; // trip is over
  return today;                                               // trip is ongoing
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
