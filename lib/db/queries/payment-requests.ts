import { cache } from "react";
import { db } from "@/lib/db/client";
import { paymentRequests } from "@/lib/db/schema/payment-requests";
import { eq, and, desc } from "drizzle-orm";
import type { PaymentRequest } from "@/lib/db/schema/payment-requests";
import { deriveRequestState } from "@/lib/payment-requests/request-state";

export { deriveRequestState } from "@/lib/payment-requests/request-state";

/**
 * Fetch a payment request by its public token.
 * Called from the public /request/[token] RSC — no auth required.
 */
export const getPaymentRequestByToken = cache(
  async (token: string): Promise<{
    row: PaymentRequest;
    isExpired: boolean;
    isResolved: boolean;
    isSelfReported: boolean;
  } | null> => {
    const row = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.token, token))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!row) return null;

    return { row, ...deriveRequestState(row) };
  }
);

// ── Settle page — pending self-reports for admin confirmation surface ────────

/**
 * All self-reported payment requests for a group, newest first.
 *
 * Intentionally NO expiry filter. Expiry only governs whether the *public page*
 * accepts new self-reports (status='pending'). Once a ghost has self-reported, the
 * admin must be able to confirm regardless of token age — a ghost who paid on day 6
 * of a 7-day token must not vanish from the admin surface on day 8 (silent failure,
 * balance left uncorrected).
 *
 * Used by the Trip/Nest settle page "Pending external payments" section (§7).
 * Auth check is the caller's responsibility (settle page RSC already validates membership).
 */
export const getPendingRequestsForGroup = cache(async (groupId: string): Promise<PaymentRequest[]> => {
  return db
    .select()
    .from(paymentRequests)
    .where(
      and(
        eq(paymentRequests.groupId, groupId),
        eq(paymentRequests.status, "self_reported"),
      )
    )
    .orderBy(desc(paymentRequests.selfReportedAt));
});
