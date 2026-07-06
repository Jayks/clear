import { z } from "zod";

/**
 * Round 16 fix #7: `selfReportExternalPayment` is the one public, unauthenticated
 * money-adjacent action (`/request/[token]`) — it had no Zod validation at all.
 * `paidAmount` only checked `<= 0`; `Infinity`/absurd values passed through,
 * overflowed the `numeric(12,2)` column, and the resulting DB error propagated
 * as an uncaught throw (see the try/catch wrap in the action itself).
 *
 * Mirrors the bounds already used elsewhere for money inputs
 * (`lib/validations/settlement.ts`): max 999999.99, 2 decimal places.
 */
export const selfReportExternalPaymentSchema = z.object({
  method:        z.enum(["upi", "cash", "bank"]),
  utrReference:  z.string().max(30).optional(),
  paidAmount:    z.number().finite().positive().max(999999.99).optional(),
});

export type SelfReportExternalPaymentInput = z.infer<typeof selfReportExternalPaymentSchema>;
