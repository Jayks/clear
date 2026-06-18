/**
 * Pure helper: derives the three display-state flags from a PaymentRequest row.
 * No DB dependency — safe to import in tests and RSC pages alike.
 *
 * Extracted from lib/db/queries/payment-requests.ts so it can be unit-tested
 * without a live Postgres connection.
 */
import type { PaymentRequest } from "../db/schema/payment-requests";

export type RequestState = {
  isExpired:      boolean;
  isResolved:     boolean;
  isSelfReported: boolean;
};

/**
 * Derive display flags for the /request/[token] page's four server states.
 *
 *   isExpired      → "Link expired" (expiresAt is in the past)
 *   isResolved     → "No action needed" (confirmed or disputed)
 *   isSelfReported → "Waiting for admin" (self_reported OR the transient 'confirming' claim)
 *   none of the above → Active payment form
 *
 * @param now  Defaults to `new Date()`. Pass explicitly for deterministic testing.
 */
export function deriveRequestState(row: PaymentRequest, now = new Date()): RequestState {
  const isExpired = row.expiresAt < now;
  const isResolved = row.status === "confirmed" || row.status === "disputed";
  // 'confirming' is a transient claim held by confirmExternalPayment while it writes
  // the financial row (see GUEST_PAYMENT_FLOW.md §3). A guest loading mid-window must
  // see the "waiting for admin" state — NOT the active payment form.
  const isSelfReported = row.status === "self_reported" || row.status === "confirming";
  return { isExpired, isResolved, isSelfReported };
}
