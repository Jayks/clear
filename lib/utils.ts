import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_CURRENCY = "INR";
export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "SGD", "AED", "JPY", "CAD", "AUD"] as const;
export const CHART_AXIS_TICK = { fontSize: 10, fill: "#94A3B8" } as const;

export function formatCurrency(
  amount: number,
  currency = DEFAULT_CURRENCY,
  locale = "en-IN"
): string {
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
  const today = new Date().toISOString().split("T")[0];
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
